/**
 * Wipe STRATERA to a fresh first-time install: admin only, no employees or demo data.
 * Run: node scripts/reset-fresh-system.mjs
 *
 * Close STRATERA (desktop + dev server) before running.
 */
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import initSqlJs from 'sql.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

function hashPassword(password) {
  return createHash('sha256').update(password).digest('hex');
}

function locateWasm() {
  const candidates = [path.join(ROOT, 'node_modules/sql.js/dist/sql-wasm.wasm')];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  throw new Error('Could not find sql-wasm.wasm. Run install.bat first.');
}

function getDbPath() {
  const appData = process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming');
  return path.join(appData, 'STRATERA', 'stratera.db');
}

function loadSchemaSql() {
  const schemaPath = path.join(ROOT, 'database', 'src', 'schema.ts');
  const source = fs.readFileSync(schemaPath, 'utf8');
  const match = source.match(/export const SCHEMA_SQL = `([\s\S]*?)`;/);
  if (!match) throw new Error('Could not read SCHEMA_SQL from database/src/schema.ts');
  return match[1];
}

function runOptional(sqlDb, sql) {
  try {
    sqlDb.run(sql);
  } catch {
    /* column or table may already exist */
  }
}

function migrateExtensions(sqlDb) {
  runOptional(sqlDb, 'ALTER TABLE employees ADD COLUMN salary REAL NOT NULL DEFAULT 0');
  runOptional(sqlDb, 'ALTER TABLE employees ADD COLUMN position_id TEXT');
  runOptional(sqlDb, 'ALTER TABLE employees ADD COLUMN birth_date TEXT');
  runOptional(sqlDb, 'ALTER TABLE employees ADD COLUMN end_date TEXT');
  runOptional(sqlDb, 'ALTER TABLE employees ADD COLUMN termination_reason TEXT');
  runOptional(sqlDb, 'ALTER TABLE employees ADD COLUMN phone TEXT NOT NULL DEFAULT \'\'');

  runOptional(sqlDb, 'ALTER TABLE leave_requests ADD COLUMN approval_stage TEXT NOT NULL DEFAULT \'Pending Manager\'');
  runOptional(sqlDb, 'ALTER TABLE leave_requests ADD COLUMN manager_approved INTEGER NOT NULL DEFAULT 0');

  runOptional(sqlDb, 'ALTER TABLE attendance ADD COLUMN late_minutes INTEGER NOT NULL DEFAULT 0');
  runOptional(sqlDb, 'ALTER TABLE attendance ADD COLUMN overtime_hours REAL NOT NULL DEFAULT 0');

  sqlDb.run(`
    CREATE TABLE IF NOT EXISTS hr_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS leave_balances (
      employee_id TEXT PRIMARY KEY,
      annual_entitlement REAL NOT NULL DEFAULT 20,
      sick_entitlement REAL NOT NULL DEFAULT 10,
      annual_used REAL NOT NULL DEFAULT 0,
      sick_used REAL NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS holidays (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      date TEXT NOT NULL,
      recurring INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS employee_notes (
      id TEXT PRIMARY KEY,
      employee_id TEXT NOT NULL,
      note TEXT NOT NULL,
      created_at TEXT NOT NULL,
      created_by TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS employee_documents (
      id TEXT PRIMARY KEY,
      employee_id TEXT NOT NULL,
      name TEXT NOT NULL,
      file_name TEXT NOT NULL,
      file_data TEXT NOT NULL,
      uploaded_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS audit_log (
      id TEXT PRIMARY KEY,
      action TEXT NOT NULL,
      entity TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      details TEXT NOT NULL,
      user_name TEXT NOT NULL,
      timestamp TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS hr_notifications (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      read INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      link_page TEXT
    );
    CREATE TABLE IF NOT EXISTS message_templates (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      subject TEXT NOT NULL,
      body TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS email_verifications (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      email TEXT NOT NULL,
      code_hash TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      verified INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS password_reset_codes (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      email TEXT NOT NULL,
      code_hash TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      used INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );
  `);
}

function seedFreshSettings(sqlDb) {
  const defaults = {
    orgName: 'STRATERA R&D Software Group',
    workHours: '8',
    payrollCycle: 'monthly',
    leaveApproval: 'manager',
    attendanceGrace: '15',
    emailLeaveRequests: 'true',
    emailPayroll: 'true',
    emailAttendance: 'false',
    smtpEnabled: 'false',
    smtpHost: '',
    smtpPort: '587',
    smtpUser: '',
    smtpPassword: '',
    smtpFrom: '',
    sessionTimeoutMinutes: '30',
  };
  for (const [key, value] of Object.entries(defaults)) {
    sqlDb.run('INSERT OR REPLACE INTO hr_settings (key, value) VALUES (?, ?)', [key, value]);
  }
}

function clearDevCaches() {
  const smtpCache = path.join(ROOT, 'app', '.stratera-dev-smtp.json');
  if (fs.existsSync(smtpCache)) {
    fs.unlinkSync(smtpCache);
  }
}

async function main() {
  const dbPath = getDbPath();
  const dbDir = path.dirname(dbPath);

  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  if (fs.existsSync(dbPath)) {
    const backup = `${dbPath}.backup-${Date.now()}`;
    fs.copyFileSync(dbPath, backup);
    console.log(`  Backed up old database to: ${backup}`);
    fs.unlinkSync(dbPath);
  }

  const wasmPath = locateWasm();
  const SQL = await initSqlJs({ locateFile: () => wasmPath });
  const sqlDb = new SQL.Database();

  sqlDb.run(loadSchemaSql());
  migrateExtensions(sqlDb);
  seedFreshSettings(sqlDb);

  sqlDb.run(
    'INSERT INTO users (id, email, password_hash, name, role, app_access, must_change_credentials) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [
      'USR-001',
      'admin@stratera.com',
      hashPassword('admin123'),
      'System Admin',
      'Admin',
      'both',
      1,
    ],
  );

  fs.writeFileSync(dbPath, Buffer.from(sqlDb.export()));
  sqlDb.close();

  clearDevCaches();

  console.log('');
  console.log('  STRATERA reset to a fresh install.');
  console.log('');
  console.log('  Database:  (empty — no employees, no demo transactions)');
  console.log(`  Location:  ${dbPath}`);
  console.log('');
  console.log('  Sign in with:');
  console.log('    Email:    admin@stratera.com');
  console.log('    Password: admin123');
  console.log('');
  console.log('  You will be prompted to verify your email and set a new password.');
  console.log('');
  console.log('  In your browser, press Ctrl+Shift+R on the STRATERA tab');
  console.log('  (or clear site data) so old login cache is removed.');
  console.log('');
  console.log('  Then run start-stratera.bat again.');
  console.log('');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
