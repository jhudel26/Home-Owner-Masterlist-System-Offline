import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { randomUUID } from "crypto";
import { dbQuery, dbExecute } from "@/lib/db/mysql";
import { hasPermission } from "@/lib/permissions";
import type { Profile } from "@/types/database";

export const dynamic = "force-dynamic";

async function getCurrentUser(): Promise<Profile | null> {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("session");
    if (!sessionCookie) return null;

    const session = await dbQuery<any>(
      "SELECT s.*, p.id, p.full_name, p.email, p.role, p.permissions, p.status, p.created_at, p.updated_at FROM sessions s JOIN profiles p ON s.user_id = p.id WHERE s.id = ? AND s.expires_at > NOW()",
      [sessionCookie.value]
    );

    const sessionData = Array.isArray(session) ? session[0] : session;
    if (!sessionData) return null;

    let permissions = sessionData.permissions;
    if (typeof permissions === "string") {
      try {
        permissions = JSON.parse(permissions);
      } catch {
        permissions = {};
      }
    }

    return {
      id: sessionData.id,
      full_name: sessionData.full_name,
      email: sessionData.email,
      role: sessionData.role,
      permissions,
      status: sessionData.status,
      created_at: sessionData.created_at,
      updated_at: sessionData.updated_at,
    };
  } catch {
    return null;
  }
}

/**
 * Splits a SQL dump script into executable statements.
 * Safely handles single-quoted strings, double-quoted strings,
 * comments (-- and /* * /), and DELIMITER directives.
 */
function parseSqlStatements(sqlText: string): string[] {
  const statements: string[] = [];
  let current = "";
  let inSingleQuote = false;
  let inDoubleQuote = false;
  let inBacktick = false;
  let inLineComment = false;
  let inBlockComment = false;
  let currentDelimiter = ";";

  const len = sqlText.length;
  for (let i = 0; i < len; i++) {
    const ch = sqlText[i];
    const nextCh = i + 1 < len ? sqlText[i + 1] : "";

    // Handle line comments
    if (inLineComment) {
      if (ch === "\n") {
        inLineComment = false;
      }
      continue;
    }

    // Handle block comments
    if (inBlockComment) {
      if (ch === "*" && nextCh === "/") {
        inBlockComment = false;
        i++; // skip /
      }
      continue;
    }

    // Handle string escape inside quotes
    if (ch === "\\" && (inSingleQuote || inDoubleQuote || inBacktick)) {
      current += ch;
      if (i + 1 < len) {
        current += sqlText[++i];
      }
      continue;
    }

    // Handle quotes
    if (ch === "'" && !inDoubleQuote && !inBacktick) {
      inSingleQuote = !inSingleQuote;
      current += ch;
      continue;
    }
    if (ch === '"' && !inSingleQuote && !inBacktick) {
      inDoubleQuote = !inDoubleQuote;
      current += ch;
      continue;
    }
    if (ch === "`" && !inSingleQuote && !inDoubleQuote) {
      inBacktick = !inBacktick;
      current += ch;
      continue;
    }

    // Not inside quotes: check for comments
    if (!inSingleQuote && !inDoubleQuote && !inBacktick) {
      if (ch === "-" && nextCh === "-") {
        inLineComment = true;
        i++;
        continue;
      }
      if (ch === "/" && nextCh === "*") {
        inBlockComment = true;
        i++;
        continue;
      }

      // Check for DELIMITER change
      const remaining = sqlText.slice(i);
      const delimMatch = remaining.match(/^DELIMITER\s+([^\s\r\n]+)/i);
      if (delimMatch) {
        currentDelimiter = delimMatch[1];
        i += delimMatch[0].length - 1;
        continue;
      }

      // Check for delimiter match
      if (remaining.startsWith(currentDelimiter)) {
        const stmt = current.trim();
        if (stmt) {
          statements.push(stmt);
        }
        current = "";
        i += currentDelimiter.length - 1;
        continue;
      }
    }

    current += ch;
  }

  const leftover = current.trim();
  if (leftover) {
    statements.push(leftover);
  }

  return statements;
}

// POST /api/settings/database/import - Import and execute SQL backup script
export async function POST(request: NextRequest) {
  try {
    const actor = await getCurrentUser();
    if (!actor) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const canBackup =
      actor.role === "super_admin" ||
      actor.role === "admin" ||
      hasPermission(actor, "can_backup_restore");

    if (!canBackup) {
      return NextResponse.json({ error: "Permission denied" }, { status: 403 });
    }

    let sqlContent = "";
    const contentType = request.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const file = formData.get("file") as File | null;
      if (!file) {
        return NextResponse.json({ error: "No SQL file uploaded" }, { status: 400 });
      }
      sqlContent = await file.text();
    } else {
      const body = await request.json();
      sqlContent = body.sql || body.content || "";
    }

    if (!sqlContent || !sqlContent.trim()) {
      return NextResponse.json(
        { error: "SQL file is empty or could not be parsed" },
        { status: 400 }
      );
    }

    // Safety checks
    const lowerSql = sqlContent.toLowerCase();
    if (
      lowerSql.includes("drop database") ||
      lowerSql.includes("shutdown")
    ) {
      return NextResponse.json(
        { error: "Dangerous SQL command detected (DROP DATABASE / SHUTDOWN are disallowed)." },
        { status: 400 }
      );
    }

    const statements = parseSqlStatements(sqlContent);
    if (statements.length === 0) {
      return NextResponse.json(
        { error: "No executable SQL statements found in file." },
        { status: 400 }
      );
    }

    // Execute with foreign key checks disabled
    await dbExecute("SET FOREIGN_KEY_CHECKS = 0");

    let executedCount = 0;
    const errors: string[] = [];

    for (const stmt of statements) {
      // Skip empty or comment-only statements
      const cleanStmt = stmt.trim();
      if (!cleanStmt || cleanStmt.startsWith("--") || cleanStmt.startsWith("/*")) {
        continue;
      }
      // Skip statements like USE residential_masterlist if it already points to current DB
      if (/^USE\s+/i.test(cleanStmt)) {
        continue;
      }

      try {
        await dbExecute(cleanStmt);
        executedCount++;
      } catch (err: any) {
        console.warn("SQL statement warning during restore:", err.message);
        errors.push(`${cleanStmt.slice(0, 60)}...: ${err.message}`);
        // If critical syntax error on essential table, record it
        if (errors.length > 20) {
          throw new Error(`Too many errors during SQL execution: ${err.message}`);
        }
      }
    }

    await dbExecute("SET FOREIGN_KEY_CHECKS = 1");

    // Log the restore event
    try {
      await dbExecute(
        "INSERT INTO activity_logs (id, user_id, user_name, action, details) VALUES (?, ?, ?, ?, ?)",
        [
          randomUUID(),
          actor.id,
          actor.full_name,
          "RESTORED_SQL_BACKUP",
          JSON.stringify({
            statements_executed: executedCount,
            warnings_count: errors.length,
            timestamp: new Date().toISOString(),
          }),
        ]
      );
    } catch (_) {}

    return NextResponse.json({
      success: true,
      message: `Database successfully restored! Executed ${executedCount} SQL statements.`,
      executedCount,
      warningsCount: errors.length,
      warnings: errors.slice(0, 5),
    });
  } catch (error: any) {
    console.error("SQL Import failed:", error);
    try {
      await dbExecute("SET FOREIGN_KEY_CHECKS = 1");
    } catch (_) {}
    return NextResponse.json(
      { error: error?.message || "Failed to import SQL backup" },
      { status: 500 }
    );
  }
}
