# STRATERA Desktop Applications

Professional desktop software suite by **STRATERA R&D Software Group**.

This monorepo contains two Electron-based desktop applications with a **shared SQLite database**, user authentication, and consistent STRATERA branding.

| Application | Description |
|-------------|-------------|
| **STRATERA Accounting** | Financial management — accounts, transactions, invoices, and reports |
| **STRATERA HR** | Human resources — employees, payroll, attendance, leave, and departments |

## Prerequisites

- [Node.js](https://nodejs.org/) 18 or later
- npm 9+

## Setup

```bash
cd STRATERA
npm install
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

## Demo Login Credentials

| Email | Password | Access |
|-------|----------|--------|
| `admin@stratera.com` | `admin123` | Both apps |
| `accountant@stratera.com` | `account123` | Accounting only |
| `hr@stratera.com` | `hr123` | HR only |

## Data Persistence

Both applications share a single SQLite database stored locally at:

`%APPDATA%/STRATERA/stratera.db`

Data is seeded automatically on first launch with sample records.

## Build Installers

```bash
npm run build:accounting
npm run build:hr
```

Windows installers are output to `accounting/release/` and `hr/release/`.

## Project Structure

```
STRATERA/
├── assets/           # Logo and brand assets
├── database/         # @stratera/database — SQLite schema, queries, IPC handlers
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
- **Create transactions and invoices** (saved to SQLite)
- **PDF export** — invoices and six financial reports (P&L, balance sheet, cash flow, etc.)
- **Edit & delete** — transactions and invoices (payroll-synced transactions are protected)
- **Email invoices** — opens your mail client with a pre-filled message
- Company settings

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
- **SQLite** (better-sqlite3) — local data persistence
- **React 18** + **TypeScript** — UI
- **Vite** — build tooling
- **npm workspaces** — monorepo
