import http from 'node:http';
import type { StrateraDatabase } from './database';
import type { CheckInConfirmInput, CheckInLookupInput } from './types';

export const KIOSK_HTTP_PORT = Number(process.env.STRATERA_KIOSK_HTTP_PORT || 5192);

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
        if (path === '/api/kiosk/health' && req.method === 'GET') {
          sendJson(res, 200, { ok: true, service: 'stratera-kiosk' });
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

    server.listen(KIOSK_HTTP_PORT, '0.0.0.0', () => {
      console.log(`STRATERA kiosk API listening on http://0.0.0.0:${KIOSK_HTTP_PORT}`);
    });

    return server;
  } catch (err) {
    console.error('STRATERA kiosk HTTP server failed:', err);
    return null;
  }
}
