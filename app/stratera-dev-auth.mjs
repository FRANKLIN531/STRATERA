/**
 * Dev-only HTTP API so account setup works in the browser tab during local development.
 */
import fs from 'node:fs';
import path from 'node:path';
import { deliverVerificationEmail, deliverPasswordResetEmail, deliverEmployeeMessageEmail } from './smtp-send.mjs';

const pending = new Map();
const passwordResetPending = new Map();
const smtpCachePath = path.join(process.cwd(), '.stratera-dev-smtp.json');

/** SMTP saved during account setup so password reset can send email in dev. */
let devSmtp = null;

function loadDevSmtp() {
  try {
    if (fs.existsSync(smtpCachePath)) {
      devSmtp = JSON.parse(fs.readFileSync(smtpCachePath, 'utf8'));
    }
  } catch {
    devSmtp = null;
  }
}

function saveDevSmtp(smtp) {
  devSmtp = smtp;
  try {
    fs.writeFileSync(smtpCachePath, JSON.stringify(smtp));
  } catch {
    /* ignore write errors */
  }
}

loadDevSmtp();

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => {
      data += chunk;
    });
    req.on('end', () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

function json(res, status, payload) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(payload));
}

export function strateraDevAuthPlugin() {
  return {
    name: 'stratera-dev-auth',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url?.split('?')[0];
        if (!url?.startsWith('/__stratera/dev/')) return next();

        if (url === '/__stratera/dev/send-verification' && req.method === 'POST') {
          try {
            const { email, smtp } = await readBody(req);
            const normalized = String(email || '').trim().toLowerCase();
            if (!normalized.includes('@')) {
              json(res, 400, { ok: false, error: 'This email address is invalid.' });
              return;
            }
            if (!smtp?.host || !smtp?.user || !smtp?.password || !smtp?.from) {
              json(res, 400, { ok: false, error: 'Complete all mail server fields.' });
              return;
            }
            const code = String(Math.floor(100000 + Math.random() * 900000));
            const sent = await deliverVerificationEmail(normalized, code, smtp);
            if (!sent.ok) {
              json(res, 500, { ok: false, error: sent.error });
              return;
            }
            pending.set(normalized, { code, expires: Date.now() + 15 * 60 * 1000 });
            saveDevSmtp(smtp);
            json(res, 200, { ok: true });
          } catch (err) {
            json(res, 500, {
              ok: false,
              error: err instanceof Error ? err.message : 'Could not send verification email.',
            });
          }
          return;
        }

        if (url === '/__stratera/dev/verify-code' && req.method === 'POST') {
          try {
            const { email, code } = await readBody(req);
            const normalized = String(email || '').trim().toLowerCase();
            const trimmed = String(code || '').trim();
            const entry = pending.get(normalized);
            if (!entry) {
              json(res, 400, { ok: false, error: 'Please verify your email address before continuing.' });
              return;
            }
            if (Date.now() > entry.expires) {
              pending.delete(normalized);
              json(res, 400, { ok: false, error: 'Verification code expired. Send a new code.' });
              return;
            }
            if (entry.code !== trimmed) {
              json(res, 400, { ok: false, error: 'Invalid verification code. Check your email and try again.' });
              return;
            }
            pending.delete(normalized);
            json(res, 200, { ok: true, verifiedEmail: normalized });
          } catch (err) {
            json(res, 500, { ok: false, error: err instanceof Error ? err.message : 'Verification failed.' });
          }
          return;
        }

        if (url === '/__stratera/dev/send-password-reset' && req.method === 'POST') {
          try {
            const { email, smtp } = await readBody(req);
            const normalized = String(email || '').trim().toLowerCase();
            if (!normalized.includes('@')) {
              json(res, 400, { ok: false, error: 'This email address is invalid.' });
              return;
            }
            if (smtp?.host && smtp?.user && smtp?.password && smtp?.from) {
              saveDevSmtp(smtp);
            }
            const smtpToUse = devSmtp;
            if (!smtpToUse?.host) {
              json(res, 400, {
                ok: false,
                error:
                  'Mail server is not configured. Complete account setup first, or configure SMTP in HR Settings.',
              });
              return;
            }
            const code = String(Math.floor(100000 + Math.random() * 900000));
            const sent = await deliverPasswordResetEmail(normalized, code, smtpToUse);
            if (!sent.ok) {
              json(res, 500, { ok: false, error: sent.error });
              return;
            }
            passwordResetPending.set(normalized, { code, expires: Date.now() + 15 * 60 * 1000 });
            json(res, 200, { ok: true });
          } catch (err) {
            json(res, 500, {
              ok: false,
              error: err instanceof Error ? err.message : 'Could not send reset code.',
            });
          }
          return;
        }

        if (url === '/__stratera/dev/complete-password-reset' && req.method === 'POST') {
          try {
            const { email, code, newPassword } = await readBody(req);
            const normalized = String(email || '').trim().toLowerCase();
            const trimmed = String(code || '').trim();
            const password = String(newPassword || '');
            if (password.length < 6) {
              json(res, 400, { ok: false, error: 'Password must be at least 6 characters.' });
              return;
            }
            const entry = passwordResetPending.get(normalized);
            if (!entry) {
              json(res, 400, { ok: false, error: 'No reset request found. Send a new code from your email.' });
              return;
            }
            if (Date.now() > entry.expires) {
              passwordResetPending.delete(normalized);
              json(res, 400, { ok: false, error: 'Reset code expired. Send a new code.' });
              return;
            }
            if (entry.code !== trimmed) {
              json(res, 400, { ok: false, error: 'Invalid reset code. Check your email and try again.' });
              return;
            }
            passwordResetPending.delete(normalized);
            json(res, 200, { ok: true });
          } catch (err) {
            json(res, 500, { ok: false, error: err instanceof Error ? err.message : 'Reset failed.' });
          }
          return;
        }

        if (url === '/__stratera/dev/send-employee-message' && req.method === 'POST') {
          try {
            const { to, employeeName, subject, body, sentBy, type, smtp } = await readBody(req);
            const recipient = String(to || '').trim().toLowerCase();
            if (!recipient.includes('@')) {
              json(res, 400, { ok: false, error: 'This email address is invalid.' });
              return;
            }
            if (smtp?.host && smtp?.user && smtp?.password && smtp?.from) {
              saveDevSmtp(smtp);
            }
            const smtpToUse = devSmtp;
            if (!smtpToUse?.host) {
              json(res, 400, {
                ok: false,
                error:
                  'Mail server is not configured. Complete account setup first, or configure SMTP in HR Settings.',
              });
              return;
            }
            const sent = await deliverEmployeeMessageEmail(
              recipient,
              String(employeeName || 'Employee'),
              String(subject || ''),
              String(body || ''),
              String(sentBy || 'HR Administrator'),
              smtpToUse,
              String(type || 'Message'),
            );
            if (!sent.ok) {
              json(res, 500, { ok: false, error: sent.error });
              return;
            }
            json(res, 200, { ok: true });
          } catch (err) {
            json(res, 500, {
              ok: false,
              error: err instanceof Error ? err.message : 'Could not send employee message.',
            });
          }
          return;
        }

        next();
      });
    },
  };
}

/** @param {string} email */
export function devVerifiedEmail(email) {
  return String(email || '').trim().toLowerCase();
}
