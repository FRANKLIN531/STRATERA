/**

 * STRATERA dev launcher — frees port, starts Vite + Electron desktop window.

 */

import { spawn, execSync } from 'node:child_process';

import fs from 'node:fs';

import http from 'node:http';

import net from 'node:net';
import os from 'node:os';

import path from 'node:path';

import { fileURLToPath } from 'node:url';



const __dirname = path.dirname(fileURLToPath(import.meta.url));

const ROOT = path.resolve(__dirname, '..');

const APP_DIR = path.join(ROOT, 'app');

const PORT = Number(process.env.STRATERA_DEV_PORT || 5190);

const URL_LOCALHOST = `http://localhost:${PORT}/`;

const URL_IPV4 = `http://127.0.0.1:${PORT}/`;
const KIOSK_PORT = Number(process.env.STRATERA_KIOSK_HTTP_PORT || 5192);

function getLanUrls() {
  const urls = [];
  const nets = os.networkInterfaces();
  for (const entries of Object.values(nets)) {
    if (!entries) continue;
    for (const entry of entries) {
      if (entry.family !== 'IPv4' || entry.internal) continue;
      urls.push(`http://${entry.address}:${PORT}/`);
    }
  }
  return urls;
}



function sleep(ms) {

  return new Promise((resolve) => setTimeout(resolve, ms));

}



function freePort(port) {

  if (process.platform !== 'win32') return;



  try {

    const out = execSync(`netstat -ano | findstr :${port} | findstr LISTENING`, {

      encoding: 'utf8',

      stdio: ['pipe', 'pipe', 'ignore'],

    });

    const pids = new Set();

    for (const line of out.split('\n')) {

      const trimmed = line.trim();

      if (!trimmed) continue;

      const pid = trimmed.split(/\s+/).pop();

      if (pid && /^\d+$/.test(pid)) pids.add(pid);

    }

    for (const pid of pids) {

      try {

        execSync(`taskkill /F /PID ${pid}`, { stdio: 'ignore' });

      } catch {

        /* already stopped */

      }

    }

    if (pids.size > 0) {

      console.log(`  Cleared port ${port} (stopped ${pids.size} old process(es)).`);

    }

  } catch {

    /* port was free */

  }

}



function portIsFree(port) {

  return new Promise((resolve) => {

    const server = net.createServer();

    server.once('error', () => resolve(false));

    server.once('listening', () => {

      server.close(() => resolve(true));

    });

    server.listen(port, '0.0.0.0');

  });

}



function probeHttp(url, timeoutMs = 3000) {

  return new Promise((resolve) => {

    const req = http.get(url, (res) => {

      res.resume();

      resolve(res.statusCode >= 200 && res.statusCode < 500);

    });

    req.on('error', () => resolve(false));

    req.setTimeout(timeoutMs, () => {

      req.destroy();

      resolve(false);

    });

  });

}



async function waitForServer(attempts = 180) {

  for (let i = 0; i < attempts; i++) {

    const okLocalhost = await probeHttp(URL_LOCALHOST);

    const okIpv4 = okLocalhost || await probeHttp(URL_IPV4);

    if (okIpv4) return true;

    await sleep(500);

  }

  return false;

}



function openBrowser(url) {

  if (process.platform === 'win32') {

    spawn('cmd', ['/c', 'start', '', url], { detached: true, stdio: 'ignore' }).unref();

  } else if (process.platform === 'darwin') {

    spawn('open', [url], { detached: true, stdio: 'ignore' }).unref();

  } else {

    spawn('xdg-open', [url], { detached: true, stdio: 'ignore' }).unref();

  }

}



function startVite() {

  const viteBin = path.join(ROOT, 'node_modules', 'vite', 'bin', 'vite.js');

  return spawn(process.execPath, [viteBin], {

    cwd: APP_DIR,

    stdio: 'inherit',

    env: {

      ...process.env,

      STRATERA_DEV_PORT: String(PORT),

      BROWSER: 'none',

    },

  });

}



async function main() {

  const viteBin = path.join(ROOT, 'node_modules', 'vite', 'bin', 'vite.js');

  if (!fs.existsSync(viteBin)) {

    console.error('');

    console.error('  ERROR: Dependencies are not installed.');

    console.error('  Run install.bat first, then start-stratera.bat again.');

    console.error('');

    process.exit(1);

  }



  console.log('');

  console.log('  Starting STRATERA...');

  console.log(`  App URL: ${URL_LOCALHOST}`);

  console.log(`           ${URL_IPV4}`);

  const lanUrls = getLanUrls();
  if (lanUrls.length > 0) {
    console.log('');
    console.log('  For employee phones on the same Wi-Fi (Attendance QR):');
    for (const url of lanUrls) {
      console.log(`           ${url}`);
    }
    const host = lanUrls[0].split('//')[1].split('/')[0].split(':')[0];
    console.log(`  Kiosk API: http://${host}:${KIOSK_PORT}`);
  }

  console.log('');



  freePort(PORT);

  await sleep(800);



  if (!(await portIsFree(PORT))) {

    console.error(`  ERROR: Port ${PORT} is still in use. Close other STRATERA windows and try again.`);

    process.exit(1);

  }



  const child = startVite();



  console.log('  Waiting for dev server (this can take up to 90 seconds on first start)...');



  const ready = await waitForServer();



  if (ready) {

    openBrowser(URL_LOCALHOST);

    await sleep(400);

    openBrowser(URL_IPV4);

    console.log('');

    console.log('  STRATERA is ready.');

    console.log(`  Browser:  ${URL_LOCALHOST}`);

    console.log(`            ${URL_IPV4}`);

    const lanUrlsReady = getLanUrls();
    if (lanUrlsReady.length > 0) {
      console.log(`  Phone QR:  ${lanUrlsReady[0]}`);
      const host = lanUrlsReady[0].split('//')[1].split('/')[0].split(':')[0];
      console.log(`  Kiosk API: http://${host}:${KIOSK_PORT}`);
    }

    console.log('  The STRATERA desktop window should also open automatically.');

    console.log('  Keep this command window open while you use the app.');

    console.log('');

  } else {

    console.error('');

    console.error('  WARNING: Dev server did not respond yet.');

    console.error(`  Try opening manually: ${URL_LOCALHOST}`);

    console.error(`                        ${URL_IPV4}`);

    console.error('  If the page still fails, check errors above and run install.bat');

    console.error('');

    console.error('  The dev server is still running — wait a moment and open the URL in your browser.');

    console.error('');

  }



  child.on('exit', (code) => process.exit(code ?? 0));

  process.on('SIGINT', () => child.kill('SIGINT'));

  process.on('SIGTERM', () => child.kill('SIGTERM'));

}



main().catch((err) => {

  console.error(err);

  process.exit(1);

});


