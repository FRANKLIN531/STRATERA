/**
 * Reset the administrator account to default demo credentials.
 * Run: node scripts/reset-admin-defaults.mjs
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
  const candidates = [
    path.join(ROOT, 'node_modules/sql.js/dist/sql-wasm.wasm'),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  throw new Error('Could not find sql-wasm.wasm');
}

function getDbPath() {
  const appData = process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming');
  return path.join(appData, 'STRATERA', 'stratera.db');
}

async function main() {
  const dbPath = getDbPath();
  if (!fs.existsSync(dbPath)) {
    console.error(`Database not found: ${dbPath}`);
    console.error('Start STRATERA once so the database is created, then run this script again.');
    process.exit(1);
  }

  const wasmPath = locateWasm();
  const SQL = await initSqlJs({ locateFile: () => wasmPath });
  const sqlDb = new SQL.Database(fs.readFileSync(dbPath));

  const admin = sqlDb.exec('SELECT id, email FROM users WHERE id = \'USR-001\' OR role = \'Admin\' LIMIT 1');
  if (!admin.length || !admin[0].values.length) {
    console.error('No administrator user found in database.');
    process.exit(1);
  }

  const adminId = admin[0].values[0][0];
  const oldEmail = admin[0].values[0][1];

  const cols = sqlDb.exec('PRAGMA table_info(users)');
  const hasMustChange = cols[0]?.values.some((row) => row[1] === 'must_change_credentials');
  if (!hasMustChange) {
    sqlDb.run('ALTER TABLE users ADD COLUMN must_change_credentials INTEGER NOT NULL DEFAULT 0');
  }

  sqlDb.run(
    'UPDATE users SET email = ?, password_hash = ?, must_change_credentials = 1 WHERE id = ?',
    ['admin@stratera.com', hashPassword('admin123'), adminId],
  );

  fs.writeFileSync(dbPath, Buffer.from(sqlDb.export()));
  sqlDb.close();

  console.log('');
  console.log('  Administrator account reset to defaults.');
  console.log(`  Previous email: ${oldEmail}`);
  console.log('  Email:    admin@stratera.com');
  console.log('  Password: admin123');
  console.log('');
  console.log('  Sign in again — you will be prompted to complete account setup.');
  console.log('');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
