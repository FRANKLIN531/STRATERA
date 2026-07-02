/**
 * Spawn Electron for dev without killing Vite when the window closes.
 * vite-plugin-electron's default startup() calls process.exit on Electron exit,
 * which stops localhost — we avoid that here.
 */
import { spawn } from 'node:child_process';
import electron from 'electron';

let electronProc = null;
let restartTimer = null;

function spawnElectron(cwd) {
  const port = process.env.STRATERA_DEV_PORT || 5190;
  const devUrl = process.env.VITE_DEV_SERVER_URL || `http://127.0.0.1:${port}/`;

  electronProc = spawn(electron, ['.', '--no-sandbox'], {
    cwd,
    stdio: 'inherit',
    env: {
      ...process.env,
      STRATERA_DEV_PORT: String(port),
      VITE_DEV_SERVER_URL: devUrl,
    },
  });

  process.electronApp = electronProc;

  electronProc.once('exit', () => {
    electronProc = null;
    process.electronApp = null;
    const closedPort = process.env.STRATERA_DEV_PORT || 5190;
    console.log('');
    console.log(`  Electron closed. Dev server still running at http://127.0.0.1:${closedPort}/`);
    console.log('');
  });

  return electronProc;
}

function killElectronTree() {
  if (!electronProc?.pid || electronProc.killed) return;
  if (process.platform === 'win32') {
    spawn('taskkill', ['/F', '/T', '/PID', String(electronProc.pid)], { stdio: 'ignore' });
  } else {
    electronProc.kill('SIGTERM');
  }
  electronProc = null;
  process.electronApp = null;
}

export function startElectronDev(cwd) {
  if (electronProc?.pid && !electronProc.killed) {
    return electronProc;
  }
  return spawnElectron(cwd);
}

/** Restart Electron after the main process bundle rebuilds (loads new IPC handlers). */
export function restartElectronDev(cwd) {
  if (restartTimer) clearTimeout(restartTimer);
  killElectronTree();
  restartTimer = setTimeout(() => {
    restartTimer = null;
    spawnElectron(cwd);
  }, 1500);
}
