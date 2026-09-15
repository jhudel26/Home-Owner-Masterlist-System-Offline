/**
 * db-init.js  — First-run database initialisation (idempotent)
 * Runs as root before the Next.js server starts.
 * Exit 0 = success / already done.  Exit 1 = fatal.
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

const SCHEMA_FILE = path.join(__dirname, "..", "database", "schema.sql");
const MARKER_FILE = path.join(DATA_DIR,  "db_initialized.marker");
const LOG_DIR     = path.join(DATA_DIR,  "logs");

// ── Logging ───────────────────────────────────────────────────────────────
function log(msg) {
  const line = `[${new Date().toISOString()}] [db-init] ${msg}`;
  console.log(line);
  try {
    if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });
    fs.appendFileSync(path.join(LOG_DIR, "launcher.log"), line + "\n");
  } catch (_) {}
}

// ── Split SQL into statements, respecting trigger bodies ──────────────────
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
    log("Already initialised — skipping.");
    process.exit(0);
  }

  log("First-run initialisation starting…");

  let conn;
  try {
    conn = await mysql.createConnection({
      host:               DB_HOST,
      port:               DB_PORT,
      user:               "root",
      password:           "",
      multipleStatements: false,
    });
    log("Connected to MariaDB as root.");

    // 1. Create database
    log(`Creating database '${DB_NAME}'…`);
    await conn.query(
      `CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\`
       CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    );

    // 2. Select it
    await conn.query(`USE \`${DB_NAME}\``);
    log("Database selected.");

    // 3. Apply schema statements (skip CREATE DATABASE and USE lines)
    log("Applying schema tables and triggers…");
    const rawSql    = fs.readFileSync(SCHEMA_FILE, "utf8");
    const stmts     = splitStatements(rawSql);

    for (const stmt of stmts) {
      const t = stmt.trim();
      // Skip anything we already handled or don't need
      if (/^CREATE\s+DATABASE/i.test(t)) continue;
      if (/^USE\b/i.test(t))            continue;
      if (/^DELIMITER\b/i.test(t))      continue;
      // Skip UPDATE/SET statements that fix existing data (not needed on fresh install)
      // but keep them — they're idempotent anyway

      try {
        await conn.query(stmt);
      } catch (err) {
        // Ignore safe duplicate errors
        if (["ER_TABLE_EXISTS_ERROR","ER_DUP_KEYNAME","ER_TRG_ALREADY_EXISTS",
             "ER_DUP_ENTRY"].includes(err.code)) {
          continue;
        }
        log(`Schema warning [${err.code}]: ${err.message.substring(0, 120)}`);
        log(`  Statement: ${t.substring(0, 80)}`);
        // Non-fatal for UPDATE/SET data-fix statements
        if (/^(UPDATE|SET\s+@)/i.test(t)) continue;
        throw err;
      }
    }
    log("Schema applied.");

    // 4. Create app user and grant privileges
    log(`Creating user '${DB_USER}'…`);
    const safePw = DB_PASS.replace(/'/g, "\\'");
    for (const host of ["127.0.0.1", "localhost"]) {
      await conn.query(
        `CREATE USER IF NOT EXISTS '${DB_USER}'@'${host}' IDENTIFIED BY '${safePw}'`
      );
      await conn.query(
        `GRANT SELECT,INSERT,UPDATE,DELETE,CREATE,DROP,INDEX,ALTER,` +
        `CREATE TEMPORARY TABLES,LOCK TABLES,EXECUTE,` +
        `CREATE ROUTINE,ALTER ROUTINE,EVENT,TRIGGER ` +
        `ON \`${DB_NAME}\`.* TO '${DB_USER}'@'${host}'`
      );
    }
    await conn.query("FLUSH PRIVILEGES");
    log("User and privileges set.");

    // 5. Write marker
    fs.writeFileSync(MARKER_FILE, `Initialised: ${new Date().toISOString()}\n`);
    log("Marker written. Done.");
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
