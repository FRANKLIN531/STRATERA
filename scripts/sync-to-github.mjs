/**
 * Stage, commit (if needed), and push to GitHub.
 * Used by sync-to-github.bat and the Cursor stop hook.
 */
import { execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function run(cmd) {
  return execSync(cmd, { cwd: root, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
}

function hasChanges() {
  return run('git status --porcelain').trim().length > 0;
}

try {
  if (!hasChanges()) {
    console.log('Already up to date — nothing to sync.');
    process.exit(0);
  }

  run('git add -A');

  const stamp = new Date().toISOString().slice(0, 19).replace('T', ' ');
  const message = `Auto-sync: ${stamp}`;
  run(`git commit -m "${message}"`);

  run('git push origin main');
  console.log('Synced to GitHub (https://github.com/FRANKLIN531/STRATERA).');
} catch (err) {
  const msg = err.stderr?.toString() || err.stdout?.toString() || err.message;
  console.error('GitHub sync failed:', msg.trim());
  process.exit(1);
}
