import type { DbEngine } from './db-client';

export interface DatabaseConfig {
  engine: DbEngine;
  /** SQLite file path (embedded / desktop default). */
  sqlitePath?: string;
  host?: string;
  port?: number;
  database?: string;
  user?: string;
  password?: string;
  ssl?: boolean;
}

function parseEngine(raw: string | undefined): DbEngine {
  const value = (raw ?? 'sqlite').trim().toLowerCase();
  if (value === 'postgres' || value === 'postgresql' || value === 'pg') return 'postgresql';
  if (value === 'mssql' || value === 'sqlserver' || value === 'sql-server') return 'mssql';
  return 'sqlite';
}

export function loadDatabaseConfig(sqlitePath?: string): DatabaseConfig {
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
      `Database engine "${config.engine}" requires: ${missing.join(', ')}. Set STRATERA_DB_TYPE=sqlite for local file mode.`,
    );
  }
}
