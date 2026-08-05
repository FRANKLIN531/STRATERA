import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import electron from 'electron';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
for (const raw of fs.readFileSync(path.join(ROOT, '.env'), 'utf8').split(/\r?\n/)) {
  const line = raw.trim();
  if (!line || line.startsWith('#') || !line.includes('=')) continue;
  const eq = line.indexOf('=');
  const key = line.slice(0, eq).trim();
  let value = line.slice(eq + 1).trim();
  if (
    (value.startsWith('"') && value.endsWith('"'))
    || (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1);
  }
  if (process.env[key] === undefined) process.env[key] = value;
}

process.env.STRATERA_DEV_PORT = '5190';
process.env.VITE_DEV_SERVER_URL = 'http://127.0.0.1:5190/';

const userData = path.join(os.tmpdir(), `stratera-desktop-${Date.now()}`);
fs.mkdirSync(userData, { recursive: true });

console.log('Opening desktop with profile:', userData);

const child = spawn(
  electron,
  ['.', '--no-sandbox', `--user-data-dir=${userData}`],
  {
    cwd: path.join(ROOT, 'app'),
    env: process.env,
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: true,
  },
);

child.stdout.on('data', (d) => process.stdout.write(d));
child.stderr.on('data', (d) => process.stderr.write(d));
child.unref();

setTimeout(() => {
  console.log('Spawned pid', child.pid);
  process.exit(0);
}, 8000);
