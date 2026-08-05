import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sql from 'mssql';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const env = {};
for (const raw of fs.readFileSync(path.join(ROOT, '.env'), 'utf8').split(/\r?\n/)) {
  const line = raw.trim();
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
  env[key] = value;
}

const cfg = {
  server: env.STRATERA_DB_HOST || 'localhost',
  port: Number(env.STRATERA_DB_PORT || 1433),
  database: env.STRATERA_DB_NAME,
  user: env.STRATERA_DB_USER,
  password: env.STRATERA_DB_PASSWORD,
  options: {
    encrypt: env.STRATERA_DB_SSL === 'true',
    trustServerCertificate: env.STRATERA_DB_SSL !== 'true',
    connectTimeout: 8000,
  },
};

console.log('Connecting to', cfg.server, cfg.port, cfg.database, 'as', cfg.user);
const pool = new sql.ConnectionPool(cfg);
try {
  await Promise.race([
    pool.connect(),
    new Promise((_, reject) => setTimeout(() => reject(new Error('TIMEOUT 8s')), 8000)),
  ]);
  console.log('SQL OK');
  await pool.close();
} catch (err) {
  console.error('SQL FAIL:', err instanceof Error ? err.message : String(err));
  process.exit(1);
}
