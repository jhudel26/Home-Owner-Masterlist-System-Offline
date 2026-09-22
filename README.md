# Residential Masterlist System

> **Official Offline HOA Registry, Household Management & Monthly Dues Financial System**  
> Built with Next.js 16, React 19, Tailwind CSS, MariaDB/MySQL, and a native Windows Claymorphic GUI Server Controller.

---

## 🌟 Overview

The **Residential Masterlist** is a production-grade, local-first management system engineered for Homeowners Associations (HOA). It operates **100% offline** on Windows PCs without requiring Vercel, Supabase, cloud databases, external CDNs, or an active Internet connection.

### ✨ Key Features

- **🏡 Homeowners Master Registry**: Complete resident profile management, lot/block addressing, contact details, occupancy status, and photo attachments.
- **👨‍👩‍👧‍👦 Household Member Tracking**: Multi-generational family member profiles linked directly to resident lots.
- **💳 Monthly Dues & Financial Ledger**: Dues assessments, payment recording, receipt tracking, and balance management.
- **📊 Real-Time Analytics Dashboard**: Visual charts for revenue collection, occupancy rates, and membership demographics.
- **🛡️ Local Session Authentication**: Secure credential validation with argon/bcrypt password hashing and local database-backed sessions.
- **📋 Audit & Activity Logs**: Immutable log trail for sensitive administrative operations and financial transactions.
- **💾 Automated Backups**: One-click JSON backup export and database restore capabilities.
- **🎨 Native Windows Launcher**: A lightweight C# WinForms GUI featuring a **Dark Claymorphic Bento Grid** design, background daemon management, auto port allocation, and system tray integration (Jellyfin-style, zero Electron overhead).
- **🌐 LAN Server Access**: Other devices on the same network can access the application via web browser (no installation required on client devices).
- **📦 1-Click Offline Installer**: Windows installer (`ResidentialMasterlistSetup.exe`) that packages Next.js standalone, portable Node.js runtime, portable MariaDB 10.11, and automatic database migration.
- **🏘️ Dynamic Village Configuration**: Customize village name and logo during initial setup for personalized branding throughout the application.

---

## 🌐 LAN Access

The application supports **LAN server access**, allowing other devices on the same local network to access the Residential Masterlist web interface without requiring any installation on those devices.

### How It Works

- The Next.js server binds to `0.0.0.0` (all network interfaces) instead of just `127.0.0.1`
- MariaDB remains bound to `127.0.0.1` only for security (not exposed to LAN)
- The launcher automatically detects the LAN IP address
- Both localhost and LAN access work simultaneously

### Accessing from Other Devices

1. **Install and run** the Residential Masterlist launcher on your main Windows PC
2. **Note the LAN IP address** displayed in the launcher (e.g., `192.168.1.100`)
3. **On any other device** (laptop, tablet, phone) on the same network:
   - Open a web browser
   - Navigate to: `http://<LAN_IP>:3000` (e.g., `http://192.168.1.100:3000`)
   - Login with your admin credentials

### Architecture Diagram

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

### Security Notes

- **MariaDB is NOT exposed to the LAN** - it remains bound to `127.0.0.1` only
- Only the Next.js web server is accessible from the LAN
- Designed for trusted local networks (home/office)
- No additional authentication/encryption for LAN access
- Windows Firewall may need to allow inbound connections on port 3000

### Troubleshooting

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

## 🏗️ Architecture

```text
┌─────────────────────────────────────────────────────────────┐
│                    Windows Target PC                        │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Native C# GUI Launcher (launcher.exe)                │  │
│  │  - Bento Grid & Claymorphism UI                       │  │
│  │  - Background Process Supervisor                      │  │
│  │  - System Tray Minimization & Port Discovery          │  │
│  │  - LAN IP Detection                                  │  │
│  └───────────────┬───────────────────────┬───────────────┘  │
│                  │ (spawns daemon)       │ (spawns daemon)  │
│                  ▼                       ▼                  │
│       ┌──────────────────────┐┌──────────────────────┐      │
│       │ Next.js Standalone   ││ MariaDB 10.11 Engine │      │
│       │ Port 3000 (HTTP)     ││ Port 33060 (TCP)     │      │
│       │ 0.0.0.0 (LAN Access) ││ 127.0.0.1 (Local)   │      │
│       └──────────┬───────────┘└──────────┬───────────┘      │
│                  │                       │                  │
│                  └───────────┬───────────┘                  │
│                              │                              │
│                              ▼                              │
│              %ProgramData%\ResidentialMasterlist\           │
│              ├── app.env (Runtime Configurations)           │
│              ├── data\   (MariaDB InnoDB Tables)            │
│              ├── uploads\ (Resident Photos)                 │
│              ├── logs\   (Launcher & Daemon Logs)           │
│              └── village_logo (Custom Village Logo)         │
└─────────────────────────────────────────────────────────────┘
```

---

## 💻 Tech Stack

| Component | Technology | Description |
|-----------|------------|-------------|
| **Frontend** | [Next.js 16](https://nextjs.org/) (App Router), React 19 | Server & Client Components, Responsive UI |
| **Styling** | [Tailwind CSS](https://tailwindcss.com/) | Modern custom styling with dark/light utilities |
| **Icons & Charts** | [Lucide React](https://lucide.dev/), [Recharts](https://recharts.org/) | Vector icons and interactive financial charts |
| **Backend API** | Next.js Route Handlers | Transactional operations via native Node.js runtime |
| **Database** | MySQL 8.0 / MariaDB 10.11 (`mysql2`) | Local relational storage with InnoDB tables |
| **Launcher** | Native C# / WinForms (.NET 4.8) | Compiled via Windows built-in `csc.exe` (131 KB binary) |
| **Installer** | [Inno Setup 6](https://jrsoftware.org/isinfo.php) | Windows self-extracting offline installer wizard |

---

## 🚀 Getting Started (Development Mode)

Follow these steps to run the application locally on your development machine.

### Prerequisites

- **Node.js**: `v18.x` or `v20.x` LTS installed ([Download Node.js](https://nodejs.org/))
- **Database**: Local MySQL or MariaDB instance (via XAMPP, Docker, or standalone MySQL service)

### 1. Clone & Install Dependencies

```bash
git clone https://github.com/jhudel26/Home-Owner-Masterlist-System-Offline
cd Home-Owner-Masterlist-System-Offline
npm install
```

### 2. Configure Environment Variables

Copy `.env.example` to create your local environment file:

```bash
cp .env.example .env.local
```

Edit `.env.local` with your MySQL credentials:

```ini
DB_HOST=localhost
DB_PORT=3306
DB_NAME=residential_masterlist
DB_USER=root
DB_PASSWORD=your_mysql_password
APP_PORT=3000
```

### 3. Initialize Database Schema

Import the schema into your local MySQL instance:

- **Option A (CLI)**:
  ```bash
  mysql -u root -p residential_masterlist < installer/database/schema.sql
  ```
- **Option B (phpMyAdmin / GUI)**:
  1. Open phpMyAdmin or your MySQL GUI (e.g., DBeaver / HeidiSQL).
  2. Create database `residential_masterlist` with collation `utf8mb4_unicode_ci`.
  3. Import the SQL statements from [`installer/database/schema.sql`](installer/database/schema.sql).

### 4. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🏘️ Initial Setup & Village Configuration

On first launch, the application will guide you through an initial setup process:

### Setup Wizard

1. **Village Name**: Enter your village/subdivision name (e.g., "Pagsinag Place West")
   - This name will be displayed throughout the application
   - Used in headers, footers, dashboard, and all branding locations
   - Can be changed later via Settings

2. **Village Logo** (Optional): Upload your village logo or association emblem
   - Appears in the sidebar, login page, and other UI locations
   - Supports PNG, JPG, and other image formats (max 5MB)
   - Stored locally and served from the uploads directory

3. **Admin Account**: Create your administrator account
   - Full name, email, and password
   - Full administrative permissions
   - Required to access the system

### Dynamic Village Settings

The village name and logo are stored in the database and fetched dynamically. All pages display the configured village name:
- Sidebar branding
- Login page header
- Dashboard title
- Monthly dues page
- Settings page
- Footer copyright
- Excel export metadata

---

## 📦 Building the Windows Standalone Offline Installer

To produce the single-file, self-contained Windows setup installer (`ResidentialMasterlistSetup.exe`):

### Prerequisites for Building the Installer

1. **Inno Setup 6**: Installed to `C:\Program Files (x86)\Inno Setup 6\` ([Download Inno Setup](https://jrsoftware.org/isdownload.php))
2. **.NET Framework 4.8 / `csc.exe`**: Pre-installed by default on Windows 10 & 11 at `C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe`.

### Step 1: Download Runtime Binaries (Run Once)

```powershell
npm run prepare:tools
```

This automatically fetches:
- Standalone portable `node.exe` (Node 18 x64) → `tools/node.exe`
- Portable MariaDB 10.11 runtime → `tools/mariadb/`

*(Note: If the automatic MariaDB download times out, download `mariadb-10.11.x-winx64.zip` from [mariadb.org](https://downloads.mariadb.org/mariadb/10.11/) and extract it to `tools/mariadb`)*.

### Step 2: Compile the Native GUI Launcher

```powershell
npm run launcher:build
```

Compiles [`installer/launcher/LauncherForm.cs`](installer/launcher/LauncherForm.cs) into `dist/launcher/launcher.exe`.

### Step 3: Package the Complete Installer

```powershell
npm run installer
```

This automated 10-step build pipeline:
1. Cleans previous build artifacts
2. Compiles Next.js into a standalone production bundle (`.next/standalone`)
3. Assembles runtime packages, MariaDB engine, and database initialization scripts
4. Generates multi-resolution `.ico` assets from `ICON.png`
5. Compiles the native Claymorphic GUI launcher
6. Invokes Inno Setup (`ISCC.exe`) to create `dist/ResidentialMasterlistSetup.exe` (~60 MB)

The resulting installer in `dist\ResidentialMasterlistSetup.exe` is completely self-contained and ready to install on any offline Windows 10/11 PC.

---

## 📂 Project Structure

```text
residential-masterlist/
├── src/
│   ├── app/                 # Next.js App Router pages and API routes
│   │   ├── api/             # REST endpoints (auth, homeowners, dues, backup, settings)
│   │   ├── dashboard/       # Administrative dashboard and metrics
│   │   ├── homeowners/      # Resident directory, CRUD modal, details
│   │   ├── monthly-dues/    # Payment tracking, dues assessments
│   │   ├── analytics/       # Data visualization charts
│   │   ├── activity-logs/   # Audit trails
│   │   └── settings/        # System configuration & backups
│   ├── components/          # Reusable UI components (Bento cards, forms, tables)
│   └── lib/                 # Database pool connection, auth sessions, validators, village settings
├── database/                # Reference SQL patches & migration scripts
├── installer/
│   ├── assets/              # App icon (.ico and .png)
│   ├── database/            # schema.sql deployed by the installer
│   ├── inno/                # setup.iss Inno Setup script
│   ├── launcher/            # LauncherForm.cs (Native C# Claymorphic WinForms GUI)
│   └── scripts/             # build-installer.js, db-init.js, prepare-tools.js
├── public/                  # Static assets and icons
├── ICON.png                 # Source image for icon generation
├── .env.example             # Template environment variables
├── next.config.mjs          # Next.js build configuration (standalone output enabled)
├── package.json             # NPM dependencies and build commands
├── PACKAGING.md             # In-depth installer packaging technical manual
└── README.md                # Project documentation
```

---

## 🛡️ Data Retention & Safe Upgrades

- **Program Files**: Installed by default to `C:\Program Files\Residential Masterlist\`
- **Persistent Data**: All live resident records, database tables, photo uploads, village logo, and configuration files reside in:
  ```text
  C:\ProgramData\ResidentialMasterlist\
  ```
- **Upgrades**: Installing a newer version automatically upgrades binary components while **preserving 100% of resident data, uploads, and village settings**
- **Uninstallation**: During uninstallation, users are asked whether to keep or remove their registry database

---

## 🎨 Customization

### Changing Village Name and Logo

After installation, village settings can be updated:

1. **Via Settings Page**: Navigate to Dashboard → Settings → General
2. **Edit Village Name**: Update the HOA/village name
3. **Upload New Logo**: Replace the village logo image
4. **Save Changes**: Apply to update all UI elements instantly

### Default Village Name

If no village name is configured, the application uses "Residential Masterlist" as the default.

---

## 📄 License

Private property of the HOA organization. All rights reserved.

---

## 📞 Support

For issues, questions, or feature requests, please contact the system administrator or refer to the technical documentation in `PACKAGING.md`.

**Version**: 1.2.0 (LAN Edition)
