export type DbEngine = 'sqlite' | 'postgresql' | 'mssql';

export interface PreparedStatement {
  run(...params: unknown[]): { changes: number };
  get(...params: unknown[]): Record<string, unknown> | undefined;
  all(...params: unknown[]): Record<string, unknown>[];
}

/** Sync database API used by StrateraDatabase (SQLite, PostgreSQL, or SQL Server). */
export interface DbClient {
  readonly engine: DbEngine;
  exec(sql: string): void;
  prepare(sql: string): PreparedStatement;
  getTableColumns(table: string): { name: string }[];
  transaction<T>(fn: () => T): () => T;
  beginBatch(): void;
  endBatch(): void;
  close(): void;
}
