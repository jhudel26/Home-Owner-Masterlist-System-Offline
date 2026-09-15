/**
 * build-installer.js
 * ------------------
 * Master build script. Run with:
 *   node installer/scripts/build-installer.js
 * or via:
 *   npm run installer
 *
 * Steps:
 *   1.  Clean previous dist output
 *   2.  npm install (production deps)
 *   3.  next build  (produces .next/standalone)
 *   4.  Assemble dist\app\  from standalone output
 *   5.  Copy Node.js runtime into dist\runtime\
 *   6.  Copy MariaDB portable into dist\runtime\mysql\
 *   7.  Bundle db-init.js + mysql2 into dist\scripts\
 *   8.  Copy schema SQL into dist\database\
 *   9.  Build launcher.exe via pkg
 *  10.  Run iscc.exe to produce ResidentialMasterlistSetup.exe
 *
 * PREREQUISITES (must be downloaded once by the developer):
 *   - Node.js v18 Windows x64 binary  →  tools\node.exe
 *   - MariaDB 10.11 portable zip       →  tools\mariadb\
 *   - Inno Setup 6 installed at        →  C:\Program Files (x86)\Inno Setup 6\iscc.exe
 *   - pkg installed globally:          →  npm install -g pkg
 */

"use strict";

const fs            = require("fs");
const path          = require("path");
const { execSync, spawnSync } = require("child_process");

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------
const ROOT       = path.resolve(__dirname, "..", "..");   // project root
const INSTALLER  = path.join(ROOT, "installer");
const DIST       = path.join(ROOT, "dist");
const TOOLS      = path.join(ROOT, "tools");              // developer downloads go here

const STANDALONE = path.join(ROOT, ".next", "standalone");
const PUBLIC_DIR = path.join(ROOT, "public");

const DIST_APP      = path.join(DIST, "app");
const DIST_RUNTIME  = path.join(DIST, "runtime");
const DIST_MYSQL    = path.join(DIST_RUNTIME, "mysql");
const DIST_SCRIPTS  = path.join(DIST, "scripts");
const DIST_DATABASE = path.join(DIST, "database");
const DIST_LAUNCHER = path.join(DIST, "launcher");

const TOOLS_NODE    = path.join(TOOLS, "node.exe");
const TOOLS_MARIADB = path.join(TOOLS, "mariadb");
const ISCC          = "C:\\Program Files (x86)\\Inno Setup 6\\iscc.exe";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function run(cmd, opts = {}) {
  console.log(`\n> ${cmd}`);
  execSync(cmd, { stdio: "inherit", cwd: ROOT, ...opts });
}

function copyDir(src, dest) {
  if (!fs.existsSync(src)) throw new Error(`Source directory not found: ${src}`);
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    // Skip Windows pending-delete temp files (rimraf, etc.)
    if (entry.name.match(/^[a-f0-9]{8}-[a-f0-9]{4}|rimraf-[a-f0-9]+$/i)) continue;
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    try {
      if (entry.isDirectory()) {
        copyDir(s, d);
      } else {
        fs.copyFileSync(s, d);
      }
    } catch (err) {
      // Skip files that are locked/pending-delete on Windows
      if (err.code === 'EPERM' || err.code === 'EBUSY' || err.code === 'ENOENT') {
        console.warn(`  Skipping locked/temp file: ${entry.name}`);
      } else {
        throw err;
      }
    }
  }
}

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function step(n, total, label) {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`  Step ${n}/${total}: ${label}`);
  console.log("=".repeat(60));
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
(async function main() {
  const TOTAL = 10;

  // ── Step 1: Clean ──────────────────────────────────────────────────────
  step(1, TOTAL, "Cleaning previous build output");
  if (fs.existsSync(DIST)) {
    try {
      fs.rmSync(DIST, { recursive: true, force: true, maxRetries: 3, retryDelay: 500 });
    } catch (_) {
      try {
        execSync(`powershell -NoProfile -Command "Remove-Item -Recurse -Force '${DIST}'"`, { stdio: "ignore" });
      } catch (e) {
        console.warn("Could not fully remove dist, continuing...");
      }
    }
  }
  if (fs.existsSync(path.join(ROOT, ".next"))) {
    try {
      fs.rmSync(path.join(ROOT, ".next"), { recursive: true, force: true, maxRetries: 3, retryDelay: 500 });
    } catch (_) {}
  }
  console.log("Clean done.");

  // ── Step 2: Install ALL deps (dev deps needed by next build for CSS) ──
  step(2, TOTAL, "Installing all dependencies (dev deps required for build)");
  run("npm install", { cwd: ROOT });

  // ── Step 3: Next.js build ──────────────────────────────────────────────
  step(3, TOTAL, "Building Next.js (standalone output)");
  run("npx next build", { cwd: ROOT });

  if (!fs.existsSync(STANDALONE)) {
    throw new Error(
      `.next/standalone not found after build.\n` +
      `Make sure next.config.mjs has output: "standalone".`
    );
  }

  // ── Step 4: Assemble dist\app ──────────────────────────────────────────
  step(4, TOTAL, "Assembling dist\\app from standalone output");
  ensureDir(DIST_APP);

  // Use robocopy for the standalone directory — handles Windows file locks
  // robocopy exit codes 0-7 are success (bit flags for files copied/skipped)
  console.log("  Copying standalone output via robocopy…");
  const roboCopy = spawnSync(
    "robocopy",
    [STANDALONE, DIST_APP, "/E", "/NFL", "/NDL", "/NJH", "/NJS", "/nc", "/ns"],
    { stdio: "inherit", windowsHide: true }
  );
  if (roboCopy.status !== null && roboCopy.status > 7) {
    throw new Error(`robocopy failed with exit code ${roboCopy.status}`);
  }

  // Copy public static assets on top (standalone doesn't include them)
  const distPublic = path.join(DIST_APP, "public");
  ensureDir(distPublic);
  copyDir(PUBLIC_DIR, distPublic);

  // Copy .next/static into app/.next/static (required by Next.js standalone)
  const nextStatic = path.join(ROOT, ".next", "static");
  if (fs.existsSync(nextStatic)) {
    const roboCopyStatic = spawnSync(
      "robocopy",
      [nextStatic, path.join(DIST_APP, ".next", "static"), "/E", "/NFL", "/NDL", "/NJH", "/NJS", "/nc", "/ns"],
      { stdio: "inherit", windowsHide: true }
    );
    if (roboCopyStatic.status !== null && roboCopyStatic.status > 7) {
      throw new Error(`robocopy static failed with exit code ${roboCopyStatic.status}`);
    }
  }

  console.log("dist\\app assembled.");

  // ── Step 5: Node.js runtime ───────────────────────────────────────────
  step(5, TOTAL, "Copying Node.js runtime");
  ensureDir(DIST_RUNTIME);
  if (!fs.existsSync(TOOLS_NODE)) {
    throw new Error(
      `Node.js runtime not found at ${TOOLS_NODE}\n` +
      `Download node-v18.x.x-win-x64.zip from https://nodejs.org/dist/latest-v18.x/\n` +
      `and place the extracted node.exe at tools\\node.exe`
    );
  }
  fs.copyFileSync(TOOLS_NODE, path.join(DIST_RUNTIME, "node.exe"));
  console.log("Node.js runtime copied.");

  // ── Step 6: MariaDB portable ──────────────────────────────────────────
  step(6, TOTAL, "Copying MariaDB portable");
  if (!fs.existsSync(TOOLS_MARIADB)) {
    throw new Error(
      `MariaDB not found at ${TOOLS_MARIADB}\n` +
      `Download mariadb-10.11.x-winx64.zip from https://downloads.mariadb.org/\n` +
      `Extract it so that tools\\mariadb\\bin\\mysqld.exe exists.`
    );
  }
  copyDir(TOOLS_MARIADB, DIST_MYSQL);
  console.log("MariaDB portable copied.");

  // ── Step 7: Scripts (db-init.js + mysql2) ─────────────────────────────
  step(7, TOTAL, "Bundling db-init script and mysql2 dependency");
  ensureDir(DIST_SCRIPTS);

  // Copy db-init.js
  fs.copyFileSync(
    path.join(INSTALLER, "scripts", "db-init.js"),
    path.join(DIST_SCRIPTS, "db-init.js")
  );

  // Write a minimal package.json so npm install works in dist\scripts
  const scriptsPkg = {
    name: "rml-scripts",
    version: "1.0.0",
    dependencies: { mysql2: "3.14.4" }
  };
  fs.writeFileSync(
    path.join(DIST_SCRIPTS, "package.json"),
    JSON.stringify(scriptsPkg, null, 2)
  );

  // Install mysql2 into dist\scripts\node_modules
  run("npm install --omit=dev", { cwd: DIST_SCRIPTS });
  console.log("Scripts bundle ready.");

  // ── Step 8: Database schema ────────────────────────────────────────────
  step(8, TOTAL, "Copying database schema");
  ensureDir(DIST_DATABASE);
  fs.copyFileSync(
    path.join(INSTALLER, "database", "schema.sql"),
    path.join(DIST_DATABASE, "schema.sql")
  );
  console.log("Schema copied.");

  // ── Step 9: Build native Windows GUI launcher.exe via csc.exe ───────
  step(9, TOTAL, "Building native Windows GUI launcher.exe");
  ensureDir(DIST_LAUNCHER);

  // Ensure icon assets are generated from ICON.png
  console.log("Generating icon assets from ICON.png…");
  const psIconScript = path.join(INSTALLER, "scripts", "generate-icon.ps1");
  if (fs.existsSync(psIconScript)) {
    run(`powershell -ExecutionPolicy Bypass -File "${psIconScript}"`, { cwd: ROOT });
  }

  const iconIco = path.join(INSTALLER, "assets", "icon.ico");
  const iconPng = path.join(INSTALLER, "assets", "icon.png");
  if (fs.existsSync(iconIco)) {
    fs.copyFileSync(iconIco, path.join(DIST_LAUNCHER, "icon.ico"));
    fs.copyFileSync(iconIco, path.join(distPublic, "favicon.ico"));
  }
  if (fs.existsSync(iconPng)) {
    fs.copyFileSync(iconPng, path.join(DIST_LAUNCHER, "icon.png"));
    fs.copyFileSync(iconPng, path.join(distPublic, "icon.png"));
    fs.copyFileSync(iconPng, path.join(distPublic, "ICON.png"));
  }

  const launcherCs = path.join(INSTALLER, "launcher", "LauncherForm.cs");
  const launcherOut = path.join(DIST_LAUNCHER, "launcher.exe");

  // Locate .NET Framework C# compiler (pre-installed on all Windows 10/11)
  const cscCandidates = [
    "C:\\Windows\\Microsoft.NET\\Framework64\\v4.0.30319\\csc.exe",
    "C:\\Windows\\Microsoft.NET\\Framework\\v4.0.30319\\csc.exe"
  ];
  const csc = cscCandidates.find(p => fs.existsSync(p));
  if (!csc) {
    throw new Error("C# compiler (csc.exe) not found in Microsoft.NET Framework directories.");
  }

  console.log(`Compiling native Windows GUI launcher using ${csc}…`);
  const iconArg = fs.existsSync(iconIco) ? `/win32icon:"${iconIco}"` : "";
  run(
    `"${csc}" /target:winexe /optimize+ /out:"${launcherOut}" ${iconArg} /r:System.Windows.Forms.dll /r:System.Drawing.dll /r:System.dll "${launcherCs}"`,
    { cwd: ROOT }
  );
  console.log("Native Windows GUI launcher.exe built successfully.");

  // ── Step 10: Run Inno Setup ───────────────────────────────────────────
  step(10, TOTAL, "Building installer with Inno Setup");
  const issFile = path.join(INSTALLER, "inno", "setup.iss");

  // Patch the OutputDir in setup.iss to the absolute dist path
  // (Inno Setup can't reliably resolve relative paths when called from scripts)
  let issContent = fs.readFileSync(issFile, "utf8");
  const absDist  = DIST.replace(/\\/g, "\\");
  issContent = issContent.replace(
    /^OutputDir=.*$/m,
    `OutputDir="${absDist}"`
  );
  fs.writeFileSync(issFile, issContent, "utf8");

  if (!fs.existsSync(ISCC)) {
    console.warn(
      `\nWARNING: Inno Setup not found at: ${ISCC}\n` +
      `Download from https://jrsoftware.org/isdownload.php and install.\n` +
      `Then re-run: npm run installer\n\n` +
      `The rest of the dist\\ output is ready — only the .exe bundling step was skipped.`
    );
  } else {
    run(`"${ISCC}" "${issFile}"`, { cwd: ROOT });
    console.log(`\nInstaller created: dist\\ResidentialMasterlistSetup.exe`);
  }

  console.log("\n" + "=".repeat(60));
  console.log("  BUILD COMPLETE");
  console.log("=".repeat(60));
  console.log(`  Installer : dist\\ResidentialMasterlistSetup.exe`);
  console.log(`  Data dir  : %ProgramData%\\ResidentialMasterlist\\`);
  console.log("=".repeat(60) + "\n");

})().catch(err => {
  console.error("\n\nBUILD FAILED:", err.message);
  console.error(err.stack);
  process.exit(1);
});
