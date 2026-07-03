import { useMemo, useState } from 'react';
import {
  getInvoicePdfDataUri,
  getInvoicePdfBase64,
  invoicePdfFilename,
  exportInvoicePdf,
} from '@stratera/shared';
import type { Invoice } from '@stratera/shared';
import { getAccountingApi } from '../api';
import { PdfPreviewModal } from './PdfPreviewModal';

const api = getAccountingApi();

interface InvoicePreviewModalProps {
  invoice: Invoice;
  initialMode?: 'preview' | 'email';
  onClose: () => void;
}

const labelStyle = { fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 } as const;

export function InvoicePreviewModal({ invoice, initialMode = 'preview', onClose }: InvoicePreviewModalProps) {
  const [note, setNote] = useState('');
  const [recipient, setRecipient] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);
  const [emailOpen, setEmailOpen] = useState(initialMode === 'email');

  const dataUri = useMemo(() => getInvoicePdfDataUri(invoice, { note }), [invoice, note]);

  const handleDownload = () => exportInvoicePdf(invoice, { note });

  const handleSend = async () => {
    setResult(null);
    if (!recipient.trim()) {
      setResult({ ok: false, text: 'Enter the recipient email address.' });
      return;
    }
    setSending(true);
    try {
      const res = await api.sendInvoiceEmail({
        invoice,
        to: recipient.trim(),
        pdfBase64: getInvoicePdfBase64(invoice, { note }),
        filename: invoicePdfFilename(invoice),
        note,
        message,
      });
      setResult(
        res.ok
          ? { ok: true, text: `Invoice sent to ${recipient.trim()}.` }
          : { ok: false, text: res.error ?? 'Could not send the invoice email.' },
      );
    } catch (err) {
      setResult({ ok: false, text: err instanceof Error ? err.message : 'Could not send the invoice email.' });
    } finally {
      setSending(false);
    }
  };

  return (
    <PdfPreviewModal
      title={`Invoice ${invoice.id}`}
      subtitle={`${invoice.client} · Review before saving or sending`}
      dataUri={dataUri}
      onClose={onClose}
      onDownload={handleDownload}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div>
          <div style={labelStyle}>Note on invoice (optional)</div>
          <textarea
            className="form-control form-control-sm"
            rows={4}
            placeholder="Add a note, payment terms, or a thank-you message..."
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <p className="small text-muted mt-1 mb-0">This text is added to the PDF above.</p>
        </div>

        <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 16 }}>
          {!emailOpen ? (
            <button
              type="button"
              className="btn btn-outline-primary w-100"
              onClick={() => setEmailOpen(true)}
            >
              Email this invoice
            </button>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <div style={labelStyle}>Recipient email</div>
                <input
                  type="email"
                  className="form-control form-control-sm"
                  placeholder="client@example.com"
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                />
              </div>
              <div>
                <div style={labelStyle}>Message (optional)</div>
                <textarea
                  className="form-control form-control-sm"
                  rows={3}
                  placeholder="Add a short message to the email body..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                />
              </div>
              <button
                type="button"
                className="btn btn-primary w-100"
                onClick={handleSend}
                disabled={sending}
              >
                {sending ? 'Sending...' : 'Send invoice PDF'}
              </button>
              <p className="small text-muted mb-0">
                The PDF above is attached and emailed using your STRATERA mail settings.
              </p>
            </div>
          )}

          {result && (
            <div
              className={`alert ${result.ok ? 'alert-success' : 'alert-danger'} py-2 px-3 mt-3 mb-0`}
              role="status"
            >
              <span className="small">{result.text}</span>
            </div>
          )}
        </div>
      </div>
    </PdfPreviewModal>
  );
}
