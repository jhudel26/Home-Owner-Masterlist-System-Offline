/**
 * prepare-tools.js
 * ----------------
 * Downloads the required runtime binaries into the tools\ directory.
 * Run once before the first build:
 *   npm run prepare:tools
 *
 * Downloads:
 *   - Node.js v18 LTS Windows x64 standalone binary  → tools\node.exe
 *   - MariaDB 10.11 LTS Windows x64 portable zip     → tools\mariadb\
 *
 * Requires an internet connection on the BUILD machine only.
 * The end-user PC never needs internet access.
 */

"use strict";

const fs      = require("fs");
const path    = require("path");
const https   = require("https");
const http    = require("http");
const { execSync } = require("child_process");

const ROOT      = path.resolve(__dirname, "..", "..");
const TOOLS_DIR = path.join(ROOT, "tools");

fs.mkdirSync(TOOLS_DIR, { recursive: true });

// ---------------------------------------------------------------------------
// Versions — update here when upgrading
// ---------------------------------------------------------------------------
const NODE_VERSION    = "18.20.4";
const MARIADB_VERSION = "10.11.8";

const NODE_EXE_URL = `https://nodejs.org/dist/v${NODE_VERSION}/win-x64/node.exe`;
const MARIADB_URL = `https://archive.mariadb.org/mariadb-${MARIADB_VERSION}/winx64-packages/mariadb-${MARIADB_VERSION}-winx64.zip`;

// ---------------------------------------------------------------------------
// Download helper using curl.exe
// ---------------------------------------------------------------------------
function downloadWithCurl(url, destFile) {
  console.log(`  Downloading: ${url}`);
  const tempFile = destFile + ".part";
  const cmd = `curl.exe -fL --retry 5 --retry-delay 2 --connect-timeout 20 -C - --progress-bar -o "${tempFile}" "${url}"`;
  execSync(cmd, { stdio: "inherit" });
  if (fs.existsSync(destFile)) fs.rmSync(destFile, { force: true });
  fs.renameSync(tempFile, destFile);
}

// ---------------------------------------------------------------------------
// Unzip helper (uses PowerShell's built-in Expand-Archive)
// ---------------------------------------------------------------------------
function unzip(zipFile, destDir) {
  console.log(`  Extracting: ${zipFile} → ${destDir}`);
  fs.mkdirSync(destDir, { recursive: true });
  execSync(
    `powershell -NoProfile -Command "Expand-Archive -Force -Path '${zipFile}' -DestinationPath '${destDir}'"`,
    { stdio: "inherit" }
  );
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
(async function main() {
  // Clean up any stale partial files
  const staleNodeZip = path.join(TOOLS_DIR, "node.zip");
  if (fs.existsSync(staleNodeZip)) fs.rmSync(staleNodeZip, { force: true });

  // ── Node.js ──────────────────────────────────────────────────────────────
  const nodeExe = path.join(TOOLS_DIR, "node.exe");
  if (fs.existsSync(nodeExe)) {
    console.log(`[1/2] Node.js already present at tools\\node.exe — skipping.`);
  } else {
    console.log(`[1/2] Downloading Node.js v${NODE_VERSION} standalone binary…`);
    downloadWithCurl(NODE_EXE_URL, nodeExe);
    console.log(`  Node.js runtime saved to tools\\node.exe`);
  }

  // ── MariaDB ───────────────────────────────────────────────────────────────
  const mariadbDir = path.join(TOOLS_DIR, "mariadb");
  const mariadbBin = path.join(mariadbDir, "bin", "mysqld.exe");
  if (fs.existsSync(mariadbBin)) {
    console.log(`[2/2] MariaDB already present at tools\\mariadb\\ — skipping.`);
  } else {
    console.log(`[2/2] Downloading MariaDB ${MARIADB_VERSION}…`);
    const mariadbZip = path.join(TOOLS_DIR, "mariadb.zip");

    try {
      downloadWithCurl(MARIADB_URL, mariadbZip);
    } catch (err) {
      console.warn(`\nAutomatic MariaDB download failed: ${err.message}`);
      console.warn(
        `\nPlease download manually:\n` +
        `  https://archive.mariadb.org/mariadb-${MARIADB_VERSION}/winx64-packages/\n` +
        `  → mariadb-${MARIADB_VERSION}-winx64.zip\n` +
        `Extract it so that tools\\mariadb\\bin\\mysqld.exe exists.\n`
      );
      process.exit(1);
    }

    const mariadbExtracted = path.join(TOOLS_DIR, "_mariadb_extracted");
    unzip(mariadbZip, mariadbExtracted);

    const inner = fs.readdirSync(mariadbExtracted).find(d =>
      fs.statSync(path.join(mariadbExtracted, d)).isDirectory()
    );
    if (!inner) throw new Error("Could not find extracted MariaDB directory.");

    // Move to tools\mariadb\
    if (fs.existsSync(mariadbDir)) fs.rmSync(mariadbDir, { recursive: true, force: true });
    fs.renameSync(path.join(mariadbExtracted, inner), mariadbDir);

    fs.rmSync(mariadbZip, { force: true });
    fs.rmSync(mariadbExtracted, { recursive: true, force: true });
    console.log(`  MariaDB saved to tools\\mariadb\\`);
  }

  console.log("\n✔  tools\\ is ready. You can now run: npm run installer\n");

})().catch(err => {
  console.error("prepare-tools failed:", err.message);
  process.exit(1);
});
