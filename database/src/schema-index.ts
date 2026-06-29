import { SCHEMA_SQL as SQLITE_SCHEMA_SQL } from './schema';
import { POSTGRES_SCHEMA_SQL } from './schemas/postgres';
import { MSSQL_SCHEMA_SQL } from './schemas/mssql';
import type { DbEngine } from './db-client';

export function getSchemaSql(engine: DbEngine): string {
  if (engine === 'postgresql') return POSTGRES_SCHEMA_SQL;
  if (engine === 'mssql') return MSSQL_SCHEMA_SQL;
  return SQLITE_SCHEMA_SQL;
}

export { SQLITE_SCHEMA_SQL as SCHEMA_SQL };
