import pg from 'pg';
import type { DbClient, PreparedStatement } from './db-client';
import type { DatabaseConfig } from './config';
import { bindSql } from './sql-params';
import { waitForPromise } from './sync-wait';

type Row = Record<string, unknown>;
type Queryable = pg.Pool | pg.PoolClient;

function splitStatements(sql: string): string[] {
  return sql
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean);
}

export class PostgresDbClient implements DbClient {
  readonly engine = 'postgresql' as const;
  private txClient: pg.PoolClient | null = null;
  private readonly pool: pg.Pool;

  constructor(config: DatabaseConfig) {
    this.pool = new pg.Pool({
      host: config.host,
      port: config.port,
      database: config.database,
      user: config.user,
      password: config.password,
      ssl: config.ssl ? { rejectUnauthorized: false } : undefined,
      max: 10,
    });
    waitForPromise(this.pool.query('SELECT 1'));
  }

  private runner(): Queryable {
    return this.txClient ?? this.pool;
  }

  exec(sql: string): void {
    for (const statement of splitStatements(sql)) {
      waitForPromise(this.runner().query(statement));
    }
  }

  getTableColumns(table: string): { name: string }[] {
    const rows = waitForPromise(
      this.runner().query(
        `SELECT column_name AS name
         FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = $1
         ORDER BY ordinal_position`,
        [table],
      ),
    ).rows as Row[];
    return rows.map((r) => ({ name: String(r.name) }));
  }

  prepare(sql: string): PreparedStatement {
    const text = bindSql(sql, this.engine);
    return {
      run: (...params: unknown[]) => {
        const result = waitForPromise(this.runner().query(text, params));
        return { changes: result.rowCount ?? 0 };
      },
      get: (...params: unknown[]) => {
        const result = waitForPromise(this.runner().query(text, params));
        return (result.rows[0] as Row | undefined) ?? undefined;
      },
      all: (...params: unknown[]) => {
        const result = waitForPromise(this.runner().query(text, params));
        return result.rows as Row[];
      },
    };
  }

  transaction<T>(fn: () => T): () => T {
    return () => {
      const client = waitForPromise(this.pool.connect());
      this.txClient = client;
      try {
        waitForPromise(client.query('BEGIN'));
        const result = fn();
        waitForPromise(client.query('COMMIT'));
        return result;
      } catch (error) {
        waitForPromise(client.query('ROLLBACK'));
        throw error;
      } finally {
        this.txClient = null;
        client.release();
      }
    };
  }

  beginBatch(): void {
    /* batch writes are autocommit per statement */
  }

  endBatch(): void {
    /* no-op */
  }

  close(): void {
    waitForPromise(this.pool.end());
  }
}
