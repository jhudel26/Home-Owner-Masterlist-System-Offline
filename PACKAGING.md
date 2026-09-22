# Residential Masterlist — Windows Installer Build Guide

## End-User Instructions (3 steps)

1. Run **`ResidentialMasterlistSetup.exe`**
2. Follow the installer wizard and click **Install**
3. Double-click **Residential Masterlist** on the desktop (or Start Menu)

That's it. The application opens automatically in your browser.

---

## Developer Build Instructions

### Prerequisites (one-time setup)

Install these on your **build PC** only. They are NOT required on the end-user PC.

| Tool | Version | Where to get it |
|------|---------|-----------------|
| Node.js | 18 LTS | <https://nodejs.org> |
| npm | bundled with Node | – |
| Inno Setup 6 | 6.x | <https://jrsoftware.org/isdownload.php> |
| .NET Framework 4.8 / csc.exe | built-in | Pre-installed with Windows 10 & 11 (`C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe`) |

Install Inno Setup to the default path:
```
C:\Program Files (x86)\Inno Setup 6\
```

---

### Step 1 — Download runtime binaries (once)

```powershell
npm run prepare:tools
```

This downloads into `tools\`:
- `tools\node.exe` — Node.js v18 Windows x64 standalone binary
- `tools\mariadb\` — MariaDB 10.11 Windows x64 portable

If the automatic download fails for MariaDB, download manually:

1. Go to <https://downloads.mariadb.org/mariadb/10.11/>
2. Download `mariadb-10.11.x-winx64.zip`
3. Extract it
4. Rename/move the extracted folder to `tools\mariadb\`
   - Verify: `tools\mariadb\bin\mysqld.exe` must exist

---

### Step 2 — Build the installer

```powershell
npm run installer
```

This runs `installer/scripts/build-installer.js` which:

1. Cleans `dist\` and `.next\`
2. Runs `npm install --omit=dev`
3. Runs `next build` (produces `.next/standalone/`)
4. Assembles `dist\app\` from the standalone output
5. Copies `tools\node.exe` → `dist\runtime\node.exe`
6. Copies `tools\mariadb\` → `dist\runtime\mysql\`
7. Bundles `db-init.js` + `mysql2` → `dist\scripts\`
8. Copies `installer\database\schema.sql` → `dist\database\`
9. Runs `csc.exe` to build the native Windows Claymorphic GUI `dist\launcher\launcher.exe`
10. Runs `iscc.exe` to build `dist\ResidentialMasterlistSetup.exe`

---

### Step 3 — Distribute

The output installer is:
```
dist\ResidentialMasterlistSetup.exe
```

Send this single file to end users.

---

## Architecture Overview

```
C:\Program Files\Residential Masterlist\
├── launcher\
│   └── launcher.exe          ← user double-clicks this
├── runtime\
│   ├── node.exe               ← bundled Node.js 18
│   └── mysql\                 ← MariaDB 10.11 portable
│       └── bin\mysqld.exe
├── app\                       ← Next.js standalone build
│   ├── server.js
│   ├── public\
│   └── .next\
├── scripts\
│   ├── db-init.js             ← first-run DB schema init
│   └── node_modules\mysql2\
└── database\
    └── schema.sql             ← full schema (idempotent)

C:\ProgramData\ResidentialMasterlist\
├── app.env                    ← runtime config (written by installer)
├── db_initialized.marker      ← prevents re-init after first run
├── data\                      ← MySQL/MariaDB data files (NEVER delete)
├── uploads\                   ← homeowner photos (NEVER delete)
├── logs\
│   ├── launcher.log
│   ├── mysql.log
│   └── app.log
└── backups\                   ← user-exported JSON backups
```

---

## Ports

| Service | Port | Notes |
|---------|------|-------|
| Next.js | 3000 (auto-fallback to 3010) | localhost + LAN access (binds to 0.0.0.0) |
| MariaDB | 33060 | localhost only, avoids conflict with XAMPP (3306) |

---

## LAN Access

The application supports LAN access, allowing other devices on the same network to access the Residential Masterlist web interface.

### Architecture

```
                LOCAL AREA NETWORK

                     Router
                       |
      +----------------+----------------+
      |                                 |
      |                                 |
  MAIN PC                         CLIENT PC
  SERVER                          Browser
      |                                 |
      |                                 |
Launcher.exe                            |
      |                                 |
Next.js Server <------ HTTP ------------+
      |
      |
  MariaDB
  127.0.0.1:33060
```

### How It Works

- The Next.js server binds to `0.0.0.0` (all interfaces) instead of just `127.0.0.1`
- MariaDB remains bound to `127.0.0.1` only for security
- The launcher automatically detects the LAN IP address
- Both localhost and LAN access are supported simultaneously

### Accessing from Other Devices

1. Start the Residential Masterlist launcher on the main PC
2. Note the LAN IP address displayed in the launcher (e.g., `192.168.1.100`)
3. On any other device on the same network, open a web browser
4. Navigate to: `http://<LAN_IP>:3000` (e.g., `http://192.168.1.100:3000`)

### Security Notes

- **MariaDB is NOT exposed to the LAN** - it remains bound to `127.0.0.1` only
- Only the Next.js web server is accessible from the LAN
- The application is designed for trusted local networks (home/office)
- No additional authentication or encryption is provided for LAN access
- Firewall rules may need to allow inbound connections on port 3000

### Troubleshooting LAN Access

**Cannot access from other devices:**
- Ensure all devices are on the same local network
- Check Windows Firewall settings on the main PC
- Temporarily disable firewall to test, then add appropriate rules
- Verify the LAN IP address displayed in the launcher

**LAN IP not detected:**
- Check network connection on the main PC
- Ensure the PC has a valid network adapter
- The launcher shows "LAN: Not available" if detection fails

---

## Configuration

All runtime config lives in:
```
C:\ProgramData\ResidentialMasterlist\app.env
```

Default values written by the installer:
```ini
DB_HOST=127.0.0.1
DB_PORT=33060
DB_NAME=residential_masterlist
DB_USER=rml_app
DB_PASSWORD=RML@localhost#2024
DB_CONNECTION_LIMIT=10
APP_PORT=3000
COOKIE_SECURE=false
```

> **Security note:** The database only listens on `127.0.0.1` and is not
> accessible from the local network.

---

## Updating the Application

1. Build a new `ResidentialMasterlistSetup.exe`
2. Run it on the target PC — the installer performs an upgrade
3. `C:\ProgramData\ResidentialMasterlist\` is **never touched** by the installer
   during upgrades, so all homeowner data, uploads, and backups are preserved

---

## Uninstallation

Use **Add/Remove Programs** or the Start Menu uninstaller.

During uninstall the user is asked:
- **Keep data** (default) — program files removed, `ProgramData` preserved
- **Delete data** — everything including homeowner records is removed

---

## Keeping Development Workflow Working

Nothing about the packaging system breaks normal development.

```powershell
# Development (unchanged)
npm run dev

# Production build test (local)
npm run build
npm run start

# Build installer
npm run installer
```

---

## Troubleshooting

**Application won't start / blank screen**
- Check `C:\ProgramData\ResidentialMasterlist\logs\launcher.log`
- Check `C:\ProgramData\ResidentialMasterlist\logs\mysql.log`
- Check `C:\ProgramData\ResidentialMasterlist\logs\app.log`

**Port 3000 already in use**
- The launcher automatically tries ports 3001–3010
- If all are busy, close other applications and restart

**Database won't start**
- Check that no other process owns port 33060
  ```powershell
  netstat -ano | findstr :33060
  ```
- Check `mysql.log` for error details

**Uploaded photos not showing after reinstall**
- Photos are stored in `C:\ProgramData\ResidentialMasterlist\uploads\`
- They persist across reinstalls as long as the user did not choose "Delete data"

**Reset the database (development only)**
- Delete `C:\ProgramData\ResidentialMasterlist\db_initialized.marker`
- Delete `C:\ProgramData\ResidentialMasterlist\data\`
- Restart the launcher — it will reinitialise from scratch
