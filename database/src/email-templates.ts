const NAVY = '#001B3A';
const MUTED = '#64748B';
const BORDER = '#e2e8f0';

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function wrapEmailHtml(title: string, bodyHtml: string, preheader = ''): string {
  const safeTitle = escapeHtml(title);
  const hiddenPreheader = preheader
    ? `<span style="display:none!important;visibility:hidden;opacity:0;color:transparent;height:0;width:0;overflow:hidden;">${escapeHtml(preheader)}</span>`
    : '';
  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="en">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="color-scheme" content="light only" />
  <meta name="supported-color-schemes" content="light" />
  <title>${safeTitle}</title>
  <style type="text/css">
    :root { color-scheme: light only; supported-color-schemes: light; }
    body, table, td { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
  </style>
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#0f172a;">
  ${hiddenPreheader}
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#f1f5f9" style="background-color:#f1f5f9;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" bgcolor="#ffffff" style="width:100%;max-width:600px;background-color:#ffffff;border:1px solid #e2e8f0;">
          <tr>
            <td bgcolor="${NAVY}" style="background-color:${NAVY};padding:28px 32px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="color:#ffffff;font-size:22px;font-weight:700;letter-spacing:0.02em;font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;">STRATERA</td>
                </tr>
                <tr>
                  <td style="color:#94a3b8;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;padding-top:6px;font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;">R&amp;D Software Group</td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td bgcolor="#ffffff" style="padding:32px;background-color:#ffffff;">
              ${bodyHtml}
            </td>
          </tr>
          <tr>
            <td bgcolor="#f8fafc" style="padding:20px 32px;background-color:#f8fafc;border-top:1px solid ${BORDER};">
              <p style="margin:0;font-size:12px;line-height:1.6;color:${MUTED};font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
                This is an automated message from STRATERA Human Resources. Please do not reply to this email.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function codeBlock(code: string): string {
  const safe = escapeHtml(code);
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0;">
    <tr>
      <td align="center" bgcolor="#f8fafc" style="padding:20px 24px;background-color:#f8fafc;border:1px solid ${BORDER};">
        <span style="font-size:32px;font-weight:700;letter-spacing:0.35em;color:${NAVY};font-family:Consolas,Monaco,monospace;">${safe}</span>
      </td>
    </tr>
  </table>`;
}

export function buildVerificationEmail(code: string): { subject: string; text: string; html: string } {
  const subject = 'STRATERA — Email verification code';
  const text = `Your STRATERA verification code is: ${code}\n\nEnter this 6-digit code in STRATERA to verify your email and complete account setup.\n\nThis code expires in 15 minutes.`;
  const html = wrapEmailHtml(
    subject,
    `<h1 style="margin:0 0 12px;font-size:22px;color:${NAVY};">Verify your email</h1>
     <p style="margin:0 0 8px;font-size:15px;line-height:1.6;color:#334155;">Use the code below to verify your email address and complete your STRATERA account setup.</p>
     ${codeBlock(code)}
     <p style="margin:0;font-size:14px;line-height:1.6;color:${MUTED};">This code expires in <strong>15 minutes</strong>. If you did not request this, you can safely ignore this email.</p>`,
    `Your STRATERA verification code is ${code}`,
  );
  return { subject, text, html };
}

export function buildPasswordResetEmail(code: string): { subject: string; text: string; html: string } {
  const subject = 'STRATERA — Password reset code';
  const text = `Your STRATERA password reset code is: ${code}\n\nEnter this 6-digit code in STRATERA to set a new password.\n\nThis code expires in 15 minutes. If you did not request a reset, ignore this email.`;
  const html = wrapEmailHtml(
    subject,
    `<h1 style="margin:0 0 12px;font-size:22px;color:${NAVY};">Reset your password</h1>
     <p style="margin:0 0 8px;font-size:15px;line-height:1.6;color:#334155;">We received a request to reset your STRATERA password. Enter the code below to continue.</p>
     ${codeBlock(code)}
     <p style="margin:0;font-size:14px;line-height:1.6;color:${MUTED};">This code expires in <strong>15 minutes</strong>. If you did not request a password reset, ignore this email and your password will stay the same.</p>`,
    `Your STRATERA password reset code is ${code}`,
  );
  return { subject, text, html };
}

export function buildEmployeeMessageEmail(
  employeeName: string,
  subject: string,
  body: string,
  sentBy: string,
  messageType?: string,
): { subject: string; html: string } {
  const mailSubject = `STRATERA HR: ${subject}`;
  const safeName = escapeHtml(employeeName);
  const safeSubject = escapeHtml(subject);
  const safeBody = escapeHtml(body).replace(/\n/g, '<br />');
  const safeSender = escapeHtml(sentBy);
  const typeLabel = messageType ? escapeHtml(messageType) : 'Message';

  const html = wrapEmailHtml(
    mailSubject,
    `<p style="margin:0 0 6px;font-size:12px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:#3b82f6;">${typeLabel}</p>
     <h1 style="margin:0 0 16px;font-size:22px;color:${NAVY};">${safeSubject}</h1>
     <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#334155;">Dear ${safeName},</p>
     <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 24px;">
       <tr>
         <td bgcolor="#f8fafc" style="padding:20px 22px;background-color:#f8fafc;border-left:4px solid ${NAVY};font-size:15px;line-height:1.7;color:#1e293b;font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;">${safeBody}</td>
       </tr>
     </table>
     <p style="margin:0;font-size:14px;color:${MUTED};">Sent by <strong style="color:#334155;">${safeSender}</strong> · STRATERA Human Resources</p>`,
    `${subject} — message from STRATERA HR`,
  );

  return { subject: mailSubject, html };
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
