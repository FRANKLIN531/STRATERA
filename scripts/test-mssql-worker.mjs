import { Worker, MessageChannel, receiveMessageOnPort } from 'node:worker_threads';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const env = {};
for (const raw of fs.readFileSync(path.join(ROOT, '.env'), 'utf8').split(/\r?\n/)) {
  const line = raw.trim();
  if (!line || line.startsWith('#') || !line.includes('=')) continue;
  const eq = line.indexOf('=');
  let value = line.slice(eq + 1).trim();
  if (
    (value.startsWith('"') && value.endsWith('"'))
    || (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1);
  }
  env[line.slice(0, eq).trim()] = value;
}

const WORKER_SOURCE = `
const { workerData } = require('worker_threads');
const sql = require('mssql');
const port = workerData.port;
let pool = null;
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
      const result = await pool.request().query(msg.text);
      reply(lock, { ok: true, recordset: result.recordset || [] });
      return;
    }
    reply(lock, { ok: false, error: 'unknown' });
  } catch (err) {
    reply(lock, { ok: false, error: err.message || String(err) });
  }
});
`;

const { port1, port2 } = new MessageChannel();
const worker = new Worker(WORKER_SOURCE, {
  eval: true,
  workerData: { port: port2 },
  transferList: [port2],
});

function call(request) {
  const lockBuffer = new SharedArrayBuffer(4);
  const lock = new Int32Array(lockBuffer);
  Atomics.store(lock, 0, 0);
  port1.postMessage({ ...request, lock: lockBuffer });
  const wait = Atomics.wait(lock, 0, 0, 20000);
  if (wait === 'timed-out') throw new Error('worker timed out');
  const envelope = receiveMessageOnPort(port1);
  const response = envelope?.message;
  if (!response?.ok) throw new Error(response?.error || 'no response');
  return response;
}

console.log('connect…');
call({
  op: 'connect',
  config: {
    server: env.STRATERA_DB_HOST,
    port: Number(env.STRATERA_DB_PORT || 1433),
    database: env.STRATERA_DB_NAME,
    user: env.STRATERA_DB_USER,
    password: env.STRATERA_DB_PASSWORD,
    options: { encrypt: false, trustServerCertificate: true, connectTimeout: 15000 },
  },
});
console.log('query…', call({ op: 'query', text: 'SELECT 1 AS ok' }).recordset);
await worker.terminate();
console.log('WORKER SYNC OK');
