# STRATERA Desktop Applications

Professional desktop software suite by **STRATERA R&D Software Group**.

This monorepo contains two Electron-based desktop applications with a **shared Microsoft SQL Server database**, user authentication, and consistent STRATERA branding.

| Application | Description |
|-------------|-------------|
| **STRATERA Accounting** | Financial management — accounts, transactions, invoices, and reports |
| **STRATERA HR** | Human resources — employees, payroll, attendance, leave, and departments |

## Prerequisites

- [Node.js](https://nodejs.org/) 18 or later
- npm 9+
- **Microsoft SQL Server** (Express, Developer, or full edition) with a database you can connect to

## Database setup

1. Copy `.env.example` to `.env` in the project root.
2. Set your SQL Server connection values (`STRATERA_DB_HOST`, `STRATERA_DB_NAME`, `STRATERA_DB_USER`, `STRATERA_DB_PASSWORD`).
3. Ensure SQL Server is running and allows TCP connections on the configured port (default `1433`).

STRATERA uses **Microsoft SQL Server** by default (`STRATERA_DB_TYPE=mssql`). Tables are created automatically on first launch.

## Setup

```bash
cd STRATERA
npm install
copy .env.example .env
```

**Windows PowerShell:** If `npm` fails with a script execution policy error, use `npm.cmd` instead of `npm`, or double-click `install.bat` in the project folder.

**Electron failed to install:** Double-click `fix-electron.bat`, then run `start-accounting.bat` again.

## Run in Development

**Accounting app:**
```bash
npm run accounting
```

Or double-click `start-accounting.bat`.

**HR app:**
```bash
npm run hr
```

Or double-click `start-hr.bat`.

**Unified portal (recommended):** double-click `start-stratera.bat`.

Create your own account from **Create an account** on the sign-in screen.

## Data Persistence

Both applications share a single **SQL Server** database configured in `.env`. Schema and seed data are applied automatically on first successful connection.

## Build Installers

```bash
npm run build:accounting
npm run build:hr
```

Windows installers are output to `accounting/release/` and `hr/release/`.

## Sync to GitHub

The repo is at [github.com/FRANKLIN531/STRATERA](https://github.com/FRANKLIN531/STRATERA).

- **After AI changes in Cursor** — saves and pushes automatically when the agent finishes (via `.cursor/hooks.json`).
- **After your own edits** — double-click **`sync-to-github.bat`** in the project folder (or run `node scripts/sync-to-github.mjs`).

Your colleague gets updates with `git pull` inside their cloned copy.

## Project Structure

```
STRATERA/
├── assets/           # Logo and brand assets
├── database/         # @stratera/database — SQL Server schema, queries, IPC handlers
├── shared/           # @stratera/shared — UI components, theme, API types
├── accounting/       # Accounting Electron app
├── hr/               # HR Electron app
└── package.json      # npm workspaces root
```

## Features

### Accounting
- Secure login with role-based app access
- Dashboard with live financial metrics from database
- Chart of accounts, transactions, invoices
- **Create transactions and invoices** (saved to SQL Server)
- **PDF export** — invoices and six financial reports (P&L, balance sheet, cash flow, etc.)
- **Edit & delete** — transactions and invoices (payroll-synced transactions are protected)
- **Email invoices** — send PDF invoices from the desktop
- Company settings and backup/restore

### HR
- Secure login with role-based app access
- Workforce dashboard with attendance and leave metrics
- Employee directory, payroll, attendance tracking
- **Add, edit, and delete employees**
- **Submit, edit, or delete pending leave requests**
- **Approve or reject pending leave** from the Leave page
- **Payroll → Accounting sync** — process payroll posts labor expenses and cash outflows automatically
- **Payroll PDF export** — downloadable payroll summary report
- Department organization

## Tech Stack

- **Electron** — cross-platform desktop runtime
- **Microsoft SQL Server** (`mssql`) — primary data store
- **React 18** + **TypeScript** — UI
- **Vite** — build tooling
- **npm workspaces** — monorepo
