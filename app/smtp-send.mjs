import nodemailer from 'nodemailer';
import {
  buildEmployeeMessageEmail,
  buildPasswordResetEmail,
  buildVerificationEmail,
  sleep,
} from './email-templates.mjs';

export function normalizeSmtpPassword(password) {
  return String(password || '').replace(/\s/g, '');
}

export function createSmtpTransport(smtp, portOverride) {
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

export function smtpErrorMessage(err, kind = 'verification') {
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

function isRetryableSmtpError(msg) {
  return /ECONNRESET|ETIMEDOUT|ECONNREFUSED|socket hang up|ESOCKET|greeting never received|connection closed|timeout/i.test(
    msg,
  );
}

function formatOutboundMail(fromAddress, to, subject, html) {
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

async function deliverSmtpMail(smtp, mail, errorKind) {
  const host = smtp.host.trim().toLowerCase();
  const isGmail = host.includes('gmail');
  const ports = isGmail ? [587, 465] : [Number(smtp.port) || 587];
  const payload = formatOutboundMail(mail.from, mail.to, mail.subject, mail.html);

  let lastErr;
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

export async function deliverVerificationEmail(to, code, smtp) {
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

export async function deliverPasswordResetEmail(to, code, smtp) {
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

export async function deliverEmployeeMessageEmail(to, employeeName, subject, body, sentBy, smtp, messageType = 'Message') {
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

export { sleep };
