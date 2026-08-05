import fs from 'fs';
import path from 'path';
import type { DbEngine } from './db-client';

export interface DatabaseConfig {
  engine: DbEngine;
  /** Optional SQLite file path (legacy / offline fallback only). */
  sqlitePath?: string;
  host?: string;
  port?: number;
  database?: string;
  user?: string;
  password?: string;
  ssl?: boolean;
}

/** Load KEY=VALUE pairs from a .env file into process.env (does not override existing vars). */
export function loadEnvFile(filePath?: string): void {
  const candidates = [
    filePath,
    path.join(process.cwd(), '.env'),
    path.join(process.cwd(), '..', '.env'),
    // Electron main bundle lives in app/dist-electron → repo root is ../..
    path.join(__dirname, '../../.env'),
    path.join(__dirname, '../../../.env'),
    path.join(__dirname, '../../../../.env'),
  ].filter((p): p is string => Boolean(p));

  for (const candidate of candidates) {
    try {
      if (!fs.existsSync(candidate)) continue;
      const text = fs.readFileSync(candidate, 'utf8');
      for (const rawLine of text.split(/\r?\n/)) {
        const line = rawLine.trim();
        if (!line || line.startsWith('#')) continue;
        const eq = line.indexOf('=');
        if (eq <= 0) continue;
        const key = line.slice(0, eq).trim();
        let value = line.slice(eq + 1).trim();
        if (
          (value.startsWith('"') && value.endsWith('"'))
          || (value.startsWith("'") && value.endsWith("'"))
        ) {
          value = value.slice(1, -1);
        }
        if (process.env[key] === undefined) {
          process.env[key] = value;
        }
      }
      return;
    } catch {
      /* try next path */
    }
  }
}

function parseEngine(raw: string | undefined): DbEngine {
  const value = (raw ?? 'mssql').trim().toLowerCase();
  if (value === 'postgres' || value === 'postgresql' || value === 'pg') return 'postgresql';
  if (value === 'sqlite' || value === 'local') return 'sqlite';
  if (value === 'mssql' || value === 'sqlserver' || value === 'sql-server' || value === 'sql server') {
    return 'mssql';
  }
  return 'mssql';
}

export function loadDatabaseConfig(sqlitePath?: string): DatabaseConfig {
  loadEnvFile();

  const engine = parseEngine(process.env.STRATERA_DB_TYPE);
  const config: DatabaseConfig = {
    engine,
    sqlitePath,
    host: process.env.STRATERA_DB_HOST,
    port: process.env.STRATERA_DB_PORT ? Number(process.env.STRATERA_DB_PORT) : undefined,
    database: process.env.STRATERA_DB_NAME,
    user: process.env.STRATERA_DB_USER,
    password: process.env.STRATERA_DB_PASSWORD,
    ssl: process.env.STRATERA_DB_SSL === 'true',
  };

  if (engine === 'postgresql' && !config.port) config.port = 5432;
  if (engine === 'mssql' && !config.port) config.port = 1433;

  return config;
}

export function validateDatabaseConfig(config: DatabaseConfig): void {
  if (config.engine === 'sqlite') return;
  const missing: string[] = [];
  if (!config.host) missing.push('STRATERA_DB_HOST');
  if (!config.database) missing.push('STRATERA_DB_NAME');
  if (!config.user) missing.push('STRATERA_DB_USER');
  if (config.password === undefined) missing.push('STRATERA_DB_PASSWORD');
  if (missing.length) {
    throw new Error(
      `SQL Server requires: ${missing.join(', ')}. Copy .env.example to .env and set your SQL Server connection details.`,
    );
  }
}
