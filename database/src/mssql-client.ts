import { Worker, MessageChannel, receiveMessageOnPort } from 'node:worker_threads';
import type { MessagePort } from 'node:worker_threads';
import type { DbClient, PreparedStatement } from './db-client';
import type { DatabaseConfig } from './config';
import { adaptSql } from './sql-params';

type Row = Record<string, unknown>;

type WorkerResponse =
  | { ok: true; recordset?: Row[]; changes?: number }
  | { ok: false; error: string };

/**
 * MSSQL I/O runs in a Worker thread. The Electron main thread blocks with
 * Atomics.wait + receiveMessageOnPort (message handlers cannot run while waiting).
 */
const WORKER_SOURCE = `
const { parentPort, workerData } = require('worker_threads');
const sql = require('mssql');

const port = workerData.port;
let pool = null;
let transaction = null;

function runner() {
  return transaction || pool;
}

function reply(lock, payload) {
  port.postMessage(payload);
  Atomics.store(lock, 0, 1);
  Atomics.notify(lock, 0);
}

port.on('message', async (msg) => {
  const lock = new Int32Array(msg.lock);
  try {
    if (msg.op === 'connect') {
      pool = new sql.ConnectionPool(msg.config);
      await pool.connect();
      reply(lock, { ok: true });
      return;
    }
    if (msg.op === 'query') {
      const request = runner().request();
      (msg.params || []).forEach((value, index) => {
        request.input('p' + (index + 1), value);
      });
      const result = await request.query(msg.text);
      reply(lock, {
        ok: true,
        recordset: result.recordset || [],
        changes: (result.rowsAffected && result.rowsAffected[0]) || 0,
      });
      return;
    }
    if (msg.op === 'columns') {
      const result = await pool.request()
        .input('table', sql.NVarChar, msg.table)
        .query(
          "SELECT COLUMN_NAME AS name FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = @table ORDER BY ORDINAL_POSITION"
        );
      reply(lock, { ok: true, recordset: result.recordset || [] });
      return;
    }
    if (msg.op === 'begin') {
      transaction = new sql.Transaction(pool);
      await transaction.begin();
      reply(lock, { ok: true });
      return;
    }
    if (msg.op === 'commit') {
      await transaction.commit();
      transaction = null;
      reply(lock, { ok: true });
      return;
    }
    if (msg.op === 'rollback') {
      if (transaction) {
        await transaction.rollback();
        transaction = null;
      }
      reply(lock, { ok: true });
      return;
    }
    if (msg.op === 'close') {
      if (pool) await pool.close();
      pool = null;
      transaction = null;
      reply(lock, { ok: true });
      return;
    }
    reply(lock, { ok: false, error: 'Unknown op: ' + msg.op });
  } catch (err) {
    reply(lock, { ok: false, error: err && err.message ? err.message : String(err) });
  }
});
`;

function splitStatements(batchSql: string): string[] {
  return batchSql
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean);
}

export class MssqlDbClient implements DbClient {
  readonly engine = 'mssql' as const;
  private worker: Worker;
  private port: MessagePort;
  private connected = false;

  constructor(config: DatabaseConfig) {
    const { port1, port2 } = new MessageChannel();
    this.port = port1;
    this.worker = new Worker(WORKER_SOURCE, {
      eval: true,
      workerData: { port: port2 },
      transferList: [port2],
    });

    this.call({
      op: 'connect',
      config: {
        server: config.host!,
        port: config.port,
        database: config.database,
        user: config.user,
        password: config.password,
        options: {
          encrypt: config.ssl ?? true,
          trustServerCertificate: !config.ssl,
          connectTimeout: 15000,
        },
      },
    });
    this.connected = true;
  }

  private call(request: Record<string, unknown>): { recordset: Row[]; changes: number } {
    const lockBuffer = new SharedArrayBuffer(4);
    const lock = new Int32Array(lockBuffer);
    Atomics.store(lock, 0, 0);

    this.port.postMessage({ ...request, lock: lockBuffer });
    Atomics.wait(lock, 0, 0);

    const envelope = receiveMessageOnPort(this.port);
    const response = envelope?.message as WorkerResponse | undefined;
    if (!response) throw new Error('SQL Server worker returned no response.');
    if (!response.ok) throw new Error(response.error);
    return {
      recordset: response.recordset ?? [],
      changes: response.changes ?? 0,
    };
  }

  exec(batchSql: string): void {
    for (const statement of splitStatements(batchSql)) {
      const text = adaptSql(statement, this.engine);
      this.call({ op: 'query', text });
    }
  }

  getTableColumns(table: string): { name: string }[] {
    const result = this.call({ op: 'columns', table });
    return result.recordset.map((r) => ({ name: String(r.name) }));
  }

  prepare(rawSql: string): PreparedStatement {
    const text = adaptSql(rawSql, this.engine);
    return {
      run: (...params: unknown[]) => {
        const result = this.call({ op: 'query', text, params });
        return { changes: result.changes };
      },
      get: (...params: unknown[]) => {
        const result = this.call({ op: 'query', text, params });
        return result.recordset[0];
      },
      all: (...params: unknown[]) => {
        const result = this.call({ op: 'query', text, params });
        return result.recordset;
      },
    };
  }

  transaction<T>(fn: () => T): () => T {
    return () => {
      this.call({ op: 'begin' });
      try {
        const result = fn();
        this.call({ op: 'commit' });
        return result;
      } catch (error) {
        try {
          this.call({ op: 'rollback' });
        } catch {
          /* ignore rollback errors */
        }
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
    if (!this.connected) return;
    try {
      this.call({ op: 'close' });
    } finally {
      this.connected = false;
      this.port.close();
      void this.worker.terminate();
    }
  }
}
