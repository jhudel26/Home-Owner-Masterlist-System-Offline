# St. Joseph Village 6 Phase 4 — Residential Masterlist System

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
- **📦 1-Click Offline Installer**: Windows installer (`ResidentialMasterlistSetup.exe`) that packages Next.js standalone, portable Node.js runtime, portable MariaDB 10.11, and automatic database migration.

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
│  └───────────────┬───────────────────────┬───────────────┘  │
│                  │ (spawns daemon)       │ (spawns daemon)  │
│                  ▼                       ▼                  │
│       ┌──────────────────────┐┌──────────────────────┐      │
│       │ Next.js Standalone   ││ MariaDB 10.11 Engine │      │
│       │ Port 3000 (HTTP)     ││ Port 33060 (TCP)     │      │
│       └──────────┬───────────┘└──────────┬───────────┘      │
│                  │                       │                  │
│                  └───────────┬───────────┘                  │
│                              │                              │
│                              ▼                              │
│              %ProgramData%\ResidentialMasterlist\           │
│              ├── app.env (Runtime Configurations)           │
│              ├── data\   (MariaDB InnoDB Tables)            │
│              ├── uploads\ (Resident Photos)                 │
│              └── logs\   (Launcher & Daemon Logs)           │
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
git clone https://github.com/YOUR_USERNAME/residential-masterlist.git
cd residential-masterlist
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
1. Cleans previous build artifacts.
2. Compiles Next.js into a standalone production bundle (`.next/standalone`).
3. Assembles runtime packages, MariaDB engine, and database initialization scripts.
4. Generates multi-resolution `.ico` assets from `ICON.png`.
5. Compiles the native Claymorphic GUI launcher.
6. Invokes Inno Setup (`ISCC.exe`) to create `dist/ResidentialMasterlistSetup.exe` (~60 MB).

The resulting installer in `dist\ResidentialMasterlistSetup.exe` is completely self-contained and ready to install on any offline Windows 10/11 PC.

---

## 📂 Project Structure

```text
residential-masterlist/
├── src/
│   ├── app/                 # Next.js App Router pages and API routes
│   │   ├── api/             # REST endpoints (auth, homeowners, dues, backup)
│   │   ├── dashboard/       # Administrative dashboard and metrics
│   │   ├── homeowners/      # Resident directory, CRUD modal, details
│   │   ├── monthly-dues/    # Payment tracking, dues assessments
│   │   ├── analytics/       # Data visualization charts
│   │   ├── activity-logs/   # Audit trails
│   │   └── settings/        # System configuration & backups
│   ├── components/          # Reusable UI components (Bento cards, forms, tables)
│   └── lib/                 # Database pool connection, auth sessions, validators
├── database/                # Reference SQL patches & migration scripts
├── installer/
│   ├── assets/              # App icon (.ico and .png)
│   ├── database/            # schema.sql deployed by the installer
│   ├── inno/                # setup.iss Inno Setup script
│   ├── launcher/            # LauncherForm.cs (Native C# Claymorphic WinForms GUI)
│   └── scripts/             # build-installer.js, db-init.js, prepare-tools.js
├── public/                  # Static assets and icons
├── .env.example             # Template environment variables
├── next.config.mjs          # Next.js build configuration (standalone output enabled)
├── package.json             # NPM dependencies and build commands
├── PACKAGING.md             # In-depth installer packaging technical manual
└── README.md                # Project documentation
```

---

## 🛡️ Data Retention & Safe Upgrades

- **Program Files**: Installed by default to `C:\Program Files\Residential Masterlist\`.
- **Persistent Data**: All live resident records, database tables, photo uploads, and configuration files reside in:
  ```text
  C:\ProgramData\ResidentialMasterlist\
  ```
- **Upgrades**: Installing a newer version automatically upgrades binary components while **preserving 100% of resident data and uploads**.
- **Uninstallation**: During uninstallation, users are asked whether to keep or remove their registry database.

---

## 📄 License

Private property of **St. Joseph Village 6 Phase 4 HOA**. All rights reserved.
