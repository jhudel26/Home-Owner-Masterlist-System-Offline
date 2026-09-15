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

function escapeSqlValue(val: any): string {
  if (val === null || val === undefined) return "NULL";
  if (typeof val === "boolean") return val ? "1" : "0";
  if (typeof val === "number") return String(val);
  if (val instanceof Date) return `'${val.toISOString().slice(0, 19).replace("T", " ")}'`;
  if (typeof val === "object") {
    const jsonStr = JSON.stringify(val);
    return `'${jsonStr.replace(/[\0\x08\x09\x1a\n\r"'\\\%]/g, (char) => {
      switch (char) {
        case "\0": return "\\0";
        case "\x08": return "\\b";
        case "\x09": return "\\t";
        case "\x1a": return "\\z";
        case "\n": return "\\n";
        case "\r": return "\\r";
        case "\"": case "'": case "\\": case "%":
          return "\\" + char;
        default: return char;
      }
    })}'`;
  }
  const str = String(val);
  return `'${str.replace(/[\0\x08\x09\x1a\n\r"'\\\%]/g, (char) => {
    switch (char) {
      case "\0": return "\\0";
      case "\x08": return "\\b";
      case "\x09": return "\\t";
      case "\x1a": return "\\z";
      case "\n": return "\\n";
      case "\r": return "\\r";
      case "\"": case "'": case "\\": case "%":
        return "\\" + char;
      default: return char;
    }
  })}'`;
}

// GET /api/settings/database/export - Export full database SQL dump
export async function GET() {
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

    const dbName = process.env.DB_NAME || "residential_masterlist";
    const now = new Date();
    const dateStr = now.toISOString().replace(/[:.]/g, "-").slice(0, 19);

    // List of tables to dump in dependency-safe order
    const tableOrder = [
      "profiles",
      "system_settings",
      "hoa_number_sequence",
      "homeowners",
      "household_members",
      "monthly_dues",
      "activity_logs",
      "analytics_events",
      "sessions",
    ];

    // Query existing tables in current database
    const rawTables = await dbQuery<any>(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = DATABASE()"
    );
    const existingTableNames = new Set(
      rawTables.map((r) => r.table_name || r.TABLE_NAME)
    );

    const dumpLines: string[] = [];

    // Header
    dumpLines.push("-- ============================================================================");
    dumpLines.push(`-- Residential Masterlist — MySQL / MariaDB Database Dump`);
    dumpLines.push(`-- Database: ${dbName}`);
    dumpLines.push(`-- Exported by: ${actor.full_name} (${actor.email || actor.role})`);
    dumpLines.push(`-- Export Timestamp: ${now.toISOString()}`);
    dumpLines.push("-- ============================================================================\n");
    dumpLines.push("SET FOREIGN_KEY_CHECKS=0;");
    dumpLines.push("SET SQL_MODE = 'NO_AUTO_VALUE_ON_ZERO';");
    dumpLines.push("SET AUTOCOMMIT = 0;");
    dumpLines.push("START TRANSACTION;");
    dumpLines.push("SET time_zone = '+00:00';\n");

    // Process tables
    const tablesToDump = [
      ...tableOrder.filter((t) => existingTableNames.has(t)),
      ...Array.from(existingTableNames).filter((t) => !tableOrder.includes(t)),
    ];

    for (const tableName of tablesToDump) {
      dumpLines.push(`-- ----------------------------------------------------------------------------`);
      dumpLines.push(`-- Table structure for \`${tableName}\``);
      dumpLines.push(`-- ----------------------------------------------------------------------------`);
      dumpLines.push(`DROP TABLE IF EXISTS \`${tableName}\`;`);

      try {
        const createResult = await dbQuery<any>(`SHOW CREATE TABLE \`${tableName}\``);
        if (createResult && createResult[0]) {
          const createSql =
            createResult[0]["Create Table"] || createResult[0]["CREATE TABLE"];
          if (createSql) {
            dumpLines.push(`${createSql};\n`);
          }
        }
      } catch (err: any) {
        console.warn(`Could not get CREATE TABLE for ${tableName}:`, err.message);
      }

      // Dump data
      dumpLines.push(`-- Dumping data for table \`${tableName}\``);
      try {
        const rows = await dbQuery<any>(`SELECT * FROM \`${tableName}\``);
        if (rows && rows.length > 0) {
          const colNames = Object.keys(rows[0]);
          const colsEscaped = colNames.map((c) => `\`${c}\``).join(", ");

          // Batch rows in chunks of 50
          const chunkSize = 50;
          for (let i = 0; i < rows.length; i += chunkSize) {
            const chunk = rows.slice(i, i + chunkSize);
            const valClauses = chunk.map((row) => {
              const vals = colNames.map((col) => escapeSqlValue(row[col]));
              return `(${vals.join(", ")})`;
            });

            dumpLines.push(
              `INSERT INTO \`${tableName}\` (${colsEscaped}) VALUES\n  ${valClauses.join(",\n  ")};`
            );
          }
          dumpLines.push("");
        } else {
          dumpLines.push(`-- (Table \`${tableName}\` is empty)\n`);
        }
      } catch (err: any) {
        console.warn(`Could not dump data for ${tableName}:`, err.message);
      }
    }

    // HOA Trigger Definition (Standard MariaDB trigger)
    dumpLines.push(`-- ----------------------------------------------------------------------------`);
    dumpLines.push(`-- Trigger for HOA# Auto-Generation`);
    dumpLines.push(`-- ----------------------------------------------------------------------------`);
    dumpLines.push("DROP TRIGGER IF EXISTS before_homeowner_insert;");
    dumpLines.push("DELIMITER $$");
    dumpLines.push("CREATE TRIGGER before_homeowner_insert");
    dumpLines.push("BEFORE INSERT ON homeowners");
    dumpLines.push("FOR EACH ROW");
    dumpLines.push("BEGIN");
    dumpLines.push("  DECLARE next_num INT;");
    dumpLines.push("  IF NEW.hoa_number IS NULL OR NEW.hoa_number = '' THEN");
    dumpLines.push("    SELECT next_value INTO next_num FROM hoa_number_sequence WHERE id = 1;");
    dumpLines.push("    SET NEW.hoa_number = CONCAT('SJV6PH4-', LPAD(next_num, 5, '0'));");
    dumpLines.push("    UPDATE hoa_number_sequence SET next_value = next_num + 1 WHERE id = 1;");
    dumpLines.push("  END IF;");
    dumpLines.push("END$$");
    dumpLines.push("DELIMITER ;\n");

    // Footer
    dumpLines.push("COMMIT;");
    dumpLines.push("SET FOREIGN_KEY_CHECKS=1;");
    dumpLines.push(`-- Dump completed at: ${new Date().toISOString()}\n`);

    const sqlContent = dumpLines.join("\n");

    // Log the export action
    try {
      await dbExecute(
        "INSERT INTO activity_logs (id, user_id, user_name, action, details) VALUES (?, ?, ?, ?, ?)",
        [
          randomUUID(),
          actor.id,
          actor.full_name,
          "EXPORTED_SQL_DATABASE",
          JSON.stringify({
            tables_count: tablesToDump.length,
            timestamp: now.toISOString(),
          }),
        ]
      );
    } catch (_) {}

    const filename = `residential_masterlist_backup_${dateStr}.sql`;

    return new NextResponse(sqlContent, {
      status: 200,
      headers: {
        "Content-Type": "application/sql; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error: any) {
    console.error("SQL Export failed:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to export database" },
      { status: 500 }
    );
  }
}
