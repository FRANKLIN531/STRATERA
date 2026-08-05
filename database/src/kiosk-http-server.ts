import http from 'node:http';
import type { StrateraDatabase } from './database';
import type { CheckInConfirmInput, CheckInLookupInput } from './types';
import { invokeDesktopRpc } from './desktop-rpc';

export const KIOSK_HTTP_PORT = Number(process.env.STRATERA_KIOSK_HTTP_PORT || 5192);

let activeServer: http.Server | null = null;

function readJsonBody(req: http.IncomingMessage): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => {
      data += chunk;
    });
    req.on('end', () => {
      try {
        resolve(data ? (JSON.parse(data) as Record<string, unknown>) : {});
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

function sendJson(res: http.ServerResponse, status: number, payload: unknown): void {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.end(JSON.stringify(payload));
}

export function stopKioskHttpServer(): Promise<void> {
  if (!activeServer) return Promise.resolve();
  const server = activeServer;
  activeServer = null;
  return new Promise((resolve) => {
    server.close(() => resolve());
    setTimeout(resolve, 500);
  });
}

export function startKioskHttpServer(db: StrateraDatabase): http.Server | null {
  try {
    const server = http.createServer(async (req, res) => {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

      if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
      }

      const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);
      const path = url.pathname;

      try {
        if ((path === '/api/kiosk/health' || path === '/api/health') && req.method === 'GET') {
          sendJson(res, 200, { ok: true, service: 'stratera-desktop', database: true });
          return;
        }

        if (path === '/api/rpc' && req.method === 'POST') {
          const body = await readJsonBody(req);
          const method = String(body.method ?? '');
          const args = Array.isArray(body.args) ? body.args : [];
          if (!method) {
            sendJson(res, 400, { ok: false, error: 'method is required' });
            return;
          }
          try {
            const result = await invokeDesktopRpc(db, method, args);
            sendJson(res, 200, { ok: true, result });
          } catch (err) {
            const message = err instanceof Error ? err.message : 'RPC error';
            sendJson(res, 400, { ok: false, error: message });
          }
          return;
        }

        if (path === '/api/kiosk/config' && req.method === 'GET') {
          const baseUrl = url.searchParams.get('baseUrl') ?? '';
          const config = db.getKioskCheckInConfig(baseUrl);
          sendJson(res, 200, { ...config, apiBaseUrl: `http://${req.headers.host}` });
          return;
        }

        if (path === '/api/kiosk/lookup' && req.method === 'POST') {
          const body = await readJsonBody(req);
          const result = db.lookupCheckIn(body as CheckInLookupInput);
          sendJson(res, 200, result);
          return;
        }

        if (path === '/api/kiosk/confirm' && req.method === 'POST') {
          const body = await readJsonBody(req);
          const result = db.confirmCheckIn(body as CheckInConfirmInput);
          sendJson(res, 200, result);
          return;
        }

        sendJson(res, 404, { ok: false, error: 'Not found' });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Server error';
        sendJson(res, 500, { ok: false, error: message });
      }
    });

    server.on('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'EADDRINUSE') {
        console.warn(
          `STRATERA desktop API port ${KIOSK_HTTP_PORT} is already in use — browser/phone access unavailable. Close other STRATERA windows and restart.`,
        );
        return;
      }
      console.error('STRATERA desktop HTTP server error:', err);
    });

    server.listen(KIOSK_HTTP_PORT, '0.0.0.0', () => {
      activeServer = server;
      console.log(`STRATERA desktop API listening on http://0.0.0.0:${KIOSK_HTTP_PORT}`);
    });

    return server;
  } catch (err) {
    console.error('STRATERA desktop HTTP server failed:', err);
    return null;
  }
}
