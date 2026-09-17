/**
 * db-migrate.js — Database migration script for existing installations
 * Applies schema updates to existing databases without requiring reinstallation
 * Exit 0 = success. Exit 1 = fatal.
 */
"use strict";

const fs    = require("fs");
const path  = require("path");
const mysql = require("mysql2/promise");

// ── Config from environment ───────────────────────────────────────────────
const DATA_DIR  = process.env.RML_DATA_DIR;
const DB_HOST   = process.env.DB_HOST     || "127.0.0.1";
const DB_PORT   = parseInt(process.env.DB_PORT || "33060", 10);
const DB_NAME   = process.env.DB_NAME     || "residential_masterlist";
const DB_USER   = process.env.DB_USER     || "rml_app";
const DB_PASS   = process.env.DB_PASSWORD || "RML@localhost#2024";

const MIGRATION_FILE = path.join(__dirname, "..", "database", "migrations.sql");
const MARKER_FILE = path.join(DATA_DIR,  "db_migration_2024_09_17.marker");
const LOG_DIR     = path.join(DATA_DIR,  "logs");

// ── Logging ───────────────────────────────────────────────────────────────
function log(msg) {
  const line = `[${new Date().toISOString()}] [db-migrate] ${msg}`;
  console.log(line);
  try {
    if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });
    fs.appendFileSync(path.join(LOG_DIR, "launcher.log"), line + "\n");
  } catch (_) {}
}

// ── Split SQL into statements ──────────────────────────────────────────────
function splitStatements(sql) {
  const out = [];
  let buf = "";
  let inTrigger = false;

  for (const raw of sql.split("\n")) {
    const line    = raw;
    const trimmed = raw.trim();

    // Skip pure comment lines and empty lines
    if (trimmed.startsWith("--") || trimmed === "") {
      continue;
    }

    if (/^CREATE\s+TRIGGER\b/i.test(trimmed)) inTrigger = true;

    buf += line + "\n";

    if (inTrigger) {
      if (/^END\s*;?\s*$/i.test(trimmed)) {
        out.push(buf.trim());
        buf = "";
        inTrigger = false;
      }
    } else {
      if (trimmed.endsWith(";")) {
        out.push(buf.trim());
        buf = "";
      }
    }
  }
  if (buf.trim()) out.push(buf.trim());
  return out.filter(Boolean);
}

// ── Main ──────────────────────────────────────────────────────────────────
async function main() {
  if (!DATA_DIR) { log("FATAL: RML_DATA_DIR not set"); process.exit(1); }

  if (fs.existsSync(MARKER_FILE)) {
    log("Migration already applied — skipping.");
    process.exit(0); // Exit with 0 to indicate success (already migrated)
  }

  log("Database migration starting…");

  let conn;
  try {
    conn = await mysql.createConnection({
      host:               DB_HOST,
      port:               DB_PORT,
      user:               DB_USER,
      password:           DB_PASS,
      database:           DB_NAME,
      multipleStatements: false,
    });
    log(`Connected to database '${DB_NAME}' as ${DB_USER}.`);

    // Check if migration file exists
    if (!fs.existsSync(MIGRATION_FILE)) {
      log("No migration file found — nothing to migrate.");
      process.exit(0); // Exit with 0 to indicate success (nothing to do)
    }

    // Apply migration statements
    log("Applying database migrations…");
    const rawSql    = fs.readFileSync(MIGRATION_FILE, "utf8");
    const stmts     = splitStatements(rawSql);

    for (const stmt of stmts) {
      const t = stmt.trim();
      if (t === "") continue;

      try {
        await conn.query(stmt);
        log(`Applied: ${t.substring(0, 60)}...`);
      } catch (err) {
        // Ignore safe duplicate errors
        if (["ER_TABLE_EXISTS_ERROR","ER_DUP_KEYNAME","ER_TRG_ALREADY_EXISTS",
             "ER_DUP_ENTRY"].includes(err.code)) {
          log(`Skipped (already exists): ${t.substring(0, 60)}...`);
          continue;
        }
        log(`Migration error [${err.code}]: ${err.message.substring(0, 120)}`);
        log(`  Statement: ${t.substring(0, 80)}`);
        throw err;
      }
    }
    log("Migration completed successfully.");

    // Write marker
    fs.writeFileSync(MARKER_FILE, `Migrated: ${new Date().toISOString()}\n`);
    log("Migration marker written. Done.");
    process.exit(0);

  } catch (err) {
    log(`FATAL: ${err.message}`);
    log(err.stack || "");
    process.exit(1);
  } finally {
    if (conn) try { await conn.end(); } catch (_) {}
  }
}

main();