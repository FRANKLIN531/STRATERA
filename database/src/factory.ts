import fs from 'fs';
import path from 'path';
import initSqlJs from 'sql.js';
import { StrateraDatabase } from './database';
import { SqliteCompat } from './sqlite-compat';
import { PostgresDbClient } from './postgres-client';
import { MssqlDbClient } from './mssql-client';
import { loadDatabaseConfig, validateDatabaseConfig, type DatabaseConfig } from './config';
import type { DbClient } from './db-client';

function locateWasm(): string {
  const candidates = [
    path.join(process.resourcesPath ?? '', 'sql-wasm.wasm'),
    path.join(__dirname, 'sql-wasm.wasm'),
    path.join(__dirname, '../sql-wasm.wasm'),
    path.join(__dirname, '../../node_modules/sql.js/dist/sql-wasm.wasm'),
    path.join(__dirname, '../../../node_modules/sql.js/dist/sql-wasm.wasm'),
    path.join(process.cwd(), 'node_modules/sql.js/dist/sql-wasm.wasm'),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  throw new Error('Could not find sql-wasm.wasm. Run npm install from the project root.');
}

async function createSqliteClient(dbPath: string): Promise<DbClient> {
  const wasmPath = locateWasm();
  const SQL = await initSqlJs({ locateFile: () => wasmPath });

  const sqlDb = fs.existsSync(dbPath)
    ? new SQL.Database(fs.readFileSync(dbPath))
    : new SQL.Database();

  const persist = () => fs.writeFileSync(dbPath, Buffer.from(sqlDb.export()));
  return new SqliteCompat(sqlDb, persist);
}

function createServerClient(config: DatabaseConfig): DbClient {
  if (config.engine === 'postgresql') return new PostgresDbClient(config);
  return new MssqlDbClient(config);
}

/** @deprecated Pass `DatabaseConfig` or use `createStrateraDatabaseFromConfig`. */
export async function createStrateraDatabase(dbPathOrConfig?: string | DatabaseConfig): Promise<StrateraDatabase> {
  if (typeof dbPathOrConfig === 'object' && dbPathOrConfig !== null) {
    return createStrateraDatabaseFromConfig(dbPathOrConfig);
  }

  const config = loadDatabaseConfig(dbPathOrConfig);
  return createStrateraDatabaseFromConfig(config);
}

export async function createStrateraDatabaseFromConfig(config: DatabaseConfig): Promise<StrateraDatabase> {
  validateDatabaseConfig(config);

  let client: DbClient;
  if (config.engine === 'sqlite') {
    if (!config.sqlitePath) {
      throw new Error('SQLite requires a file path (sqlitePath).');
    }
    client = await createSqliteClient(config.sqlitePath);
  } else {
    client = createServerClient(config);
  }

  console.info(`[STRATERA] Database engine: ${config.engine}`);
  return new StrateraDatabase(client);
}

export { loadDatabaseConfig, validateDatabaseConfig } from './config';
export type { DatabaseConfig } from './config';
