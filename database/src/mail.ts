import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import type { SmtpConfig } from './types';
import {
  buildEmployeeMessageEmail,
  buildPasswordResetEmail,
  buildVerificationEmail,
} from './email-templates';

export function isSmtpConfigComplete(smtp: SmtpConfig): { ok: true } | { ok: false; error: string } {
  if (!smtp.host?.trim()) return { ok: false, error: 'SMTP host is required.' };
  if (!smtp.user?.trim()) return { ok: false, error: 'SMTP email / username is required.' };
  if (!smtp.password?.trim()) return { ok: false, error: 'SMTP password is required.' };
  if (!smtp.from?.trim()) return { ok: false, error: 'From email address is required.' };
  const port = Number(smtp.port);
  if (!Number.isFinite(port) || port < 1 || port > 65535) {
    return { ok: false, error: 'SMTP port is invalid.' };
  }
  return { ok: true };
}

function normalizeSmtpPassword(password: string): string {
  return String(password || '').replace(/\s/g, '');
}

function createSmtpTransport(smtp: SmtpConfig, portOverride?: number): Transporter {
  const port = portOverride ?? (Number(smtp.port) || 587);
  return nodemailer.createTransport({
    host: smtp.host.trim(),
    port,
    secure: port === 465,
    requireTLS: port === 587,
    auth: {
      user: smtp.user.trim(),
      pass: normalizeSmtpPassword(smtp.password),
    },
    connectionTimeout: 30000,
    greetingTimeout: 30000,
    socketTimeout: 30000,
    tls: { minVersion: 'TLSv1.2' },
  });
}

function smtpErrorMessage(err: unknown, kind: 'verification' | 'reset' | 'employee' = 'verification'): string {
  const msg = err instanceof Error ? err.message : String(err);
  if (/auth|535|invalid login|credentials/i.test(msg)) {
    return 'SMTP login failed. For Gmail, use an App Password (Google Account → Security → App passwords), not your regular Gmail password.';
  }
  if (
    /ECONNRESET|ETIMEDOUT|ECONNREFUSED|socket hang up|ESOCKET|greeting never received|connection closed/i.test(msg)
  ) {
    return 'Could not connect to the mail server. Check your internet, turn off VPN if you use one, wait a moment, and try again. For Gmail: smtp.gmail.com, port 587, App Password.';
  }
  const label =
    kind === 'reset' ? 'reset code' : kind === 'employee' ? 'employee message' : 'verification email';
  return `Could not send ${label}: ${msg}`;
}

function isRetryableSmtpError(msg: string): boolean {
  return /ECONNRESET|ETIMEDOUT|ECONNREFUSED|socket hang up|ESOCKET|greeting never received|connection closed|timeout/i.test(
    msg,
  );
}

function formatOutboundMail(
  fromAddress: string,
  to: string,
  subject: string,
  html: string,
) {
  const address = fromAddress.trim();
  return {
    from: {
      name: 'STRATERA HR',
      address,
    },
    to,
    subject,
    alternatives: [
      {
        contentType: 'text/html; charset=UTF-8',
        content: html,
      },
    ],
    headers: {
      'X-Mailer': 'STRATERA HR',
    },
  };
}

async function deliverSmtpMail(
  smtp: SmtpConfig,
  mail: { from: string; to: string; subject: string; html: string },
  errorKind: 'verification' | 'reset' | 'employee',
): Promise<{ ok: true } | { ok: false; error: string }> {
  const check = isSmtpConfigComplete(smtp);
  if (!check.ok) return check;

  const host = smtp.host.trim().toLowerCase();
  const isGmail = host.includes('gmail');
  const ports = isGmail ? [587, 465] : [Number(smtp.port) || 587];
  const payload = formatOutboundMail(mail.from, mail.to, mail.subject, mail.html);

  let lastErr: unknown;
  for (const port of ports) {
    const transporter = createSmtpTransport(smtp, port);
    try {
      await transporter.sendMail(payload);
      transporter.close();
      return { ok: true };
    } catch (err) {
      lastErr = err;
      const msg = err instanceof Error ? err.message : String(err);
      const retryable = isRetryableSmtpError(msg);
      if (!retryable || port === ports[ports.length - 1]) break;
    }
  }

  return { ok: false, error: smtpErrorMessage(lastErr, errorKind) };
}

export async function sendVerificationEmail(
  to: string,
  code: string,
  smtp: SmtpConfig,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const content = buildVerificationEmail(code);
  return deliverSmtpMail(
    smtp,
    {
      from: smtp.from.trim(),
      to,
      subject: content.subject,
      html: content.html,
    },
    'verification',
  );
}

export async function sendPasswordResetEmail(
  to: string,
  code: string,
  smtp: SmtpConfig,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const content = buildPasswordResetEmail(code);
  return deliverSmtpMail(
    smtp,
    {
      from: smtp.from.trim(),
      to,
      subject: content.subject,
      html: content.html,
    },
    'reset',
  );
}

export async function sendEmployeeMessageEmail(
  to: string,
  employeeName: string,
  subject: string,
  body: string,
  sentBy: string,
  smtp: SmtpConfig,
  messageType?: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const content = buildEmployeeMessageEmail(employeeName, subject, body, sentBy, messageType);
  return deliverSmtpMail(
    smtp,
    {
      from: smtp.from.trim(),
      to,
      subject: content.subject,
      html: content.html,
    },
    'employee',
  );
}
