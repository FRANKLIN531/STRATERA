import sql from 'mssql';
import type { DbClient, PreparedStatement } from './db-client';
import type { DatabaseConfig } from './config';
import { bindSql } from './sql-params';
import { waitForPromise } from './sync-wait';

type Row = Record<string, unknown>;

function splitStatements(batchSql: string): string[] {
  return batchSql
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean);
}

export class MssqlDbClient implements DbClient {
  readonly engine = 'mssql' as const;
  private pool!: sql.ConnectionPool;
  private connected = false;

  constructor(private readonly config: DatabaseConfig) {
    this.pool = new sql.ConnectionPool({
      server: config.host!,
      port: config.port,
      database: config.database,
      user: config.user,
      password: config.password,
      options: {
        encrypt: config.ssl ?? true,
        trustServerCertificate: !config.ssl,
      },
    });
    waitForPromise(this.pool.connect());
    this.connected = true;
  }

  exec(batchSql: string): void {
    for (const statement of splitStatements(batchSql)) {
      waitForPromise(this.pool.request().query(statement));
    }
  }

  getTableColumns(table: string): { name: string }[] {
    const result = waitForPromise(
      this.pool
        .request()
        .input('table', sql.NVarChar, table)
        .query(
          `SELECT COLUMN_NAME AS name
           FROM INFORMATION_SCHEMA.COLUMNS
           WHERE TABLE_NAME = @table
           ORDER BY ORDINAL_POSITION`,
        ),
    );
    return (result.recordset as Row[]).map((r) => ({ name: String(r.name) }));
  }

  prepare(rawSql: string): PreparedStatement {
    const text = bindSql(rawSql, this.engine);
    return {
      run: (...params: unknown[]) => {
        const request = this.pool.request();
        params.forEach((value, index) => {
          request.input(`p${index + 1}`, value);
        });
        const result = waitForPromise(request.query(text));
        return { changes: result.rowsAffected?.[0] ?? 0 };
      },
      get: (...params: unknown[]) => {
        const request = this.pool.request();
        params.forEach((value, index) => {
          request.input(`p${index + 1}`, value);
        });
        const result = waitForPromise(request.query(text));
        return (result.recordset[0] as Row | undefined) ?? undefined;
      },
      all: (...params: unknown[]) => {
        const request = this.pool.request();
        params.forEach((value, index) => {
          request.input(`p${index + 1}`, value);
        });
        const result = waitForPromise(request.query(text));
        return result.recordset as Row[];
      },
    };
  }

  transaction<T>(fn: () => T): () => T {
    return () => {
      const transaction = new sql.Transaction(this.pool);
      waitForPromise(transaction.begin());
      try {
        const result = fn();
        waitForPromise(transaction.commit());
        return result;
      } catch (error) {
        waitForPromise(transaction.rollback());
        throw error;
      }
    };
  }

  beginBatch(): void {
    /* bulk ops run in explicit transactions */
  }

  endBatch(): void {
    /* no-op */
  }

  close(): void {
    if (this.connected) {
      waitForPromise(this.pool.close());
      this.connected = false;
    }
  }
}
