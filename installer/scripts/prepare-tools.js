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

const NODE_URL = `https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-win-x64.zip`;
const MARIADB_URL = `https://downloads.mariadb.org/rest-api/mariadb/${MARIADB_VERSION}/mariadb-${MARIADB_VERSION}-winx64.zip`;

// ---------------------------------------------------------------------------
// Download helper
// ---------------------------------------------------------------------------
function download(url, destFile) {
  return new Promise((resolve, reject) => {
    console.log(`  Downloading: ${url}`);
    const file = fs.createWriteStream(destFile);
    const protocol = url.startsWith("https") ? https : http;

    function get(u) {
      protocol.get(u, res => {
        if (res.statusCode === 301 || res.statusCode === 302) {
          get(res.headers.location);
          return;
        }
        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode} for ${u}`));
          return;
        }
        const total = parseInt(res.headers["content-length"] || "0", 10);
        let received = 0;
        res.on("data", chunk => {
          received += chunk.length;
          if (total > 0) {
            const pct = Math.floor((received / total) * 100);
            process.stdout.write(`\r  Progress: ${pct}%  `);
          }
        });
        res.pipe(file);
        file.on("finish", () => { file.close(); console.log(""); resolve(); });
      }).on("error", reject);
    }
    get(url);
  });
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
  // ── Node.js ──────────────────────────────────────────────────────────────
  const nodeExe = path.join(TOOLS_DIR, "node.exe");
  if (fs.existsSync(nodeExe)) {
    console.log(`[1/2] Node.js already present at tools\\node.exe — skipping.`);
  } else {
    console.log(`[1/2] Downloading Node.js v${NODE_VERSION}…`);
    const nodeZip = path.join(TOOLS_DIR, "node.zip");
    await download(NODE_URL, nodeZip);

    const nodeExtracted = path.join(TOOLS_DIR, "_node_extracted");
    unzip(nodeZip, nodeExtracted);

    // The zip contains a folder like node-v18.20.4-win-x64\; find node.exe inside it
    const inner = fs.readdirSync(nodeExtracted).find(d =>
      fs.statSync(path.join(nodeExtracted, d)).isDirectory()
    );
    if (!inner) throw new Error("Could not find extracted Node.js directory.");

    fs.copyFileSync(path.join(nodeExtracted, inner, "node.exe"), nodeExe);

    // Clean up
    fs.rmSync(nodeZip, { force: true });
    fs.rmSync(nodeExtracted, { recursive: true, force: true });
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
      await download(MARIADB_URL, mariadbZip);
    } catch (err) {
      console.warn(`\nAutomatic MariaDB download failed: ${err.message}`);
      console.warn(
        `\nPlease download manually:\n` +
        `  https://downloads.mariadb.org/mariadb/${MARIADB_VERSION}/\n` +
        `  → mariadb-${MARIADB_VERSION}-winx64.zip\n` +
        `Extract it so that tools\\mariadb\\bin\\mysqld.exe exists.\n`
      );
      process.exit(0);
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
