import { buildVerificationEmail } from './email-templates';

export function getSendGridConfig(): { apiKey: string; from: string } | null {
  const apiKey = process.env.STRATERA_SENDGRID_API_KEY?.trim();
  const from = process.env.STRATERA_SENDGRID_FROM?.trim();
  if (!apiKey || !from) return null;
  return { apiKey, from };
}

export async function sendViaSendGrid(
  to: string,
  subject: string,
  html: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const config = getSendGridConfig();
  if (!config) {
    return { ok: false, error: 'SendGrid is not configured.' };
  }

  try {
    const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: to }] }],
        from: { email: config.from, name: 'STRATERA' },
        subject,
        content: [{ type: 'text/html', value: html }],
      }),
    });

    if (res.ok || res.status === 202) return { ok: true };

    const text = await res.text();
    return {
      ok: false,
      error: text?.slice(0, 200) || `SendGrid error (${res.status}). Check your API key and sender address.`,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, error: `Could not reach SendGrid: ${msg}` };
  }
}

export async function sendSignupVerificationViaSendGrid(
  to: string,
  code: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const content = buildVerificationEmail(code);
  return sendViaSendGrid(to, content.subject, content.html);
}
