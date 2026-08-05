/**
 * Open the STRATERA Electron desktop window against a running Vite server.
 * Loads root .env so SQL Server settings are available (Vite may have been
 * started before .env existed).
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import electron from 'electron';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const APP_DIR = path.join(ROOT, 'app');

function loadRootEnv() {
  const envPath = path.join(ROOT, '.env');
  if (!fs.existsSync(envPath)) return;
  for (const rawLine of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#') || !line.includes('=')) continue;
    const eq = line.indexOf('=');
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"'))
      || (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

loadRootEnv();

const required = ['STRATERA_DB_HOST', 'STRATERA_DB_NAME', 'STRATERA_DB_USER', 'STRATERA_DB_PASSWORD'];
const missing = required.filter((k) => !process.env[k] || process.env[k] === 'change-me');
if (missing.length) {
  console.error('');
  console.error('  Cannot open desktop: set these in .env first:');
  for (const key of missing) console.error(`    ${key}`);
  console.error('');
  process.exit(1);
}

process.env.STRATERA_DEV_PORT = process.env.STRATERA_DEV_PORT || '5190';
process.env.VITE_DEV_SERVER_URL =
  process.env.VITE_DEV_SERVER_URL || `http://127.0.0.1:${process.env.STRATERA_DEV_PORT}/`;

console.log('');
console.log('  Opening STRATERA desktop window…');
console.log(`  Database: ${process.env.STRATERA_DB_TYPE || 'mssql'} @ ${process.env.STRATERA_DB_HOST}`);
console.log(`  Dev URL:  ${process.env.VITE_DEV_SERVER_URL}`);
console.log('');

const child = spawn(electron, ['.', '--no-sandbox'], {
  cwd: APP_DIR,
  stdio: 'inherit',
  env: process.env,
  detached: true,
});

child.on('error', (err) => {
  console.error('  Failed to start Electron:', err.message);
  process.exit(1);
});

child.unref();
console.log(`  Desktop process started (pid ${child.pid}).`);
console.log('  Use that window — not the browser tab — for employees and check-in.');
console.log('');
