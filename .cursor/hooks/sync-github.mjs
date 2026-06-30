/**
 * Cursor stop hook — sync project to GitHub after the agent finishes.
 */
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

async function main() {
  await new Promise((resolve) => {
    let data = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => { data += chunk; });
    process.stdin.on('end', resolve);
  });

  spawnSync('node', ['scripts/sync-to-github.mjs'], {
    cwd: root,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
}

main().then(() => process.exit(0)).catch(() => process.exit(0));
