import type { Database as SqlJsDatabase, Statement } from 'sql.js';
import type { DbClient, PreparedStatement } from './db-client';

type Row = Record<string, unknown>;

export class SqliteCompat implements DbClient {
  readonly engine = 'sqlite' as const;
  private skipPersist = false;

  constructor(
    private sqlDb: SqlJsDatabase,
    private persist: () => void,
  ) {}

  beginBatch(): void {
    this.skipPersist = true;
  }

  endBatch(): void {
    this.skipPersist = false;
    this.persist();
  }

  exec(sql: string): void {
    this.sqlDb.run(sql);
    if (!this.skipPersist) this.persist();
  }

  getTableColumns(table: string): { name: string }[] {
    return this.all(`PRAGMA table_info(${table})`) as { name: string }[];
  }

  prepare(sql: string): PreparedStatement {
    const stmt = this.sqlDb.prepare(sql);
    return {
      run: (...params: unknown[]) => {
        this.bindParams(stmt, params);
        stmt.step();
        const changes = this.sqlDb.getRowsModified();
        stmt.reset();
        if (!this.skipPersist) this.persist();
        return { changes };
      },
      get: (...params: unknown[]) => {
        this.bindParams(stmt, params);
        if (stmt.step()) {
          const row = stmt.getAsObject() as Row;
          stmt.reset();
          return row;
        }
        stmt.reset();
        return undefined;
      },
      all: (...params: unknown[]) => {
        this.bindParams(stmt, params);
        const rows: Row[] = [];
        while (stmt.step()) rows.push(stmt.getAsObject() as Row);
        stmt.reset();
        return rows;
      },
    };
  }

  private all(sql: string, params: unknown[] = []): Row[] {
    const stmt = this.sqlDb.prepare(sql);
    this.bindParams(stmt, params);
    const rows: Row[] = [];
    while (stmt.step()) rows.push(stmt.getAsObject() as Row);
    stmt.free();
    return rows;
  }

  private bindParams(stmt: Statement, params: unknown[]): void {
    if (params.length > 0) stmt.bind(params as never);
  }

  transaction<T>(fn: () => T): () => T {
    return () => {
      this.skipPersist = true;
      this.sqlDb.run('BEGIN');
      try {
        const result = fn();
        this.sqlDb.run('COMMIT');
        this.persist();
        return result;
      } catch (error) {
        this.sqlDb.run('ROLLBACK');
        throw error;
      } finally {
        this.skipPersist = false;
      }
    };
  }

  close(): void {
    this.persist();
    this.sqlDb.close();
  }
}
