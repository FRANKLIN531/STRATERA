import { useCallback, useEffect, useMemo, useState } from 'react';
import QRCode from 'qrcode';
import { Button, LoadingSpinner } from '@stratera/shared';
import type { AttendanceScanLogEntry, KioskCheckInConfig } from '@stratera/shared';
import {
  getAttendanceScanLog,
  getKioskCheckInConfig,
  isDemoKioskToken,
  kioskHttpBaseUrl,
  regenerateCheckInSiteToken,
} from '../api/kioskClient';
import { SectionHeader } from './SectionHeader';
import {
  buildCheckInUrl,
  isLocalNetworkUrl,
  loadPhoneBaseUrl,
  resolveAppBaseUrl,
  savePhoneBaseUrl,
  suggestedPhoneBaseUrl,
} from '../utils/checkInUrl';

async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.left = '-9999px';
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  }
}

function printPosterHtml(siteName: string, qrDataUrl: string, posterUrl: string): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <title>STRATERA Check-in — ${siteName}</title>
        <style>
          * { box-sizing: border-box; }
          body {
            font-family: system-ui, -apple-system, Segoe UI, sans-serif;
            margin: 0;
            padding: 32px;
            text-align: center;
            color: #001b3a;
          }
          .brand { font-size: 28px; font-weight: 700; margin-bottom: 4px; }
          .site { color: #64748b; margin-bottom: 24px; }
          img { width: 280px; height: 280px; }
          h2 { font-size: 20px; margin: 24px 0 12px; }
          ol { text-align: left; max-width: 420px; margin: 0 auto 24px; line-height: 1.6; color: #334155; }
          .url { font-size: 11px; color: #64748b; word-break: break-all; }
        </style>
      </head>
      <body>
        <div class="brand">STRATERA</div>
        <div class="site">Employee check-in · ${siteName}</div>
        <img src="${qrDataUrl}" alt="QR code" />
        <h2>How to check in</h2>
        <ol>
          <li>Scan this QR code with your phone camera</li>
          <li>Enter your <strong>phone number</strong> (or email) from HR records</li>
          <li>Confirm your name, then tap <strong>Check in</strong> or <strong>Check out</strong></li>
        </ol>
        <p class="url">${posterUrl}</p>
      </body>
    </html>
  `;
}

export function KioskCheckInPanel() {
  const [config, setConfig] = useState<KioskCheckInConfig | null>(null);
  const [scanLog, setScanLog] = useState<AttendanceScanLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [regenerating, setRegenerating] = useState(false);
  const [copyHint, setCopyHint] = useState('');
  const [phoneBase, setPhoneBase] = useState(() => loadPhoneBaseUrl());
  const [qrDataUrl, setQrDataUrl] = useState('');

  const posterUrl = useMemo(() => {
    if (!config?.siteToken) return '';
    const base = phoneBase.trim() || resolveAppBaseUrl();
    return buildCheckInUrl(base, config.siteToken);
  }, [config?.siteToken, phoneBase]);

  const posterNeedsNetworkUrl = posterUrl && !isLocalNetworkUrl(posterUrl);
  const demoMode = isDemoKioskToken(config?.siteToken);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const baseUrl = resolveAppBaseUrl();
      const cfg = await getKioskCheckInConfig(baseUrl);
      if (!cfg?.siteToken) {
        throw new Error('Check-in settings could not be loaded. Restart STRATERA.');
      }
      setConfig(cfg);
      try {
        const log = await getAttendanceScanLog(30);
        setScanLog(log ?? []);
      } catch {
        setScanLog([]);
      }
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Could not load check-in settings.');
      setConfig(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!posterUrl) {
      setQrDataUrl('');
      return;
    }
    QRCode.toDataURL(posterUrl, {
      width: 280,
      margin: 2,
      color: { dark: '#001b3a', light: '#ffffff' },
    })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(''));
  }, [posterUrl]);

  const handleCopy = async () => {
    if (!posterUrl) return;
    const ok = await copyToClipboard(posterUrl);
    setCopyHint(ok ? 'Link copied!' : 'Could not copy — select the link and copy manually.');
    setTimeout(() => setCopyHint(''), 3000);
  };

  const handleOpen = () => {
    if (!posterUrl) return;
    window.open(posterUrl, '_blank', 'noopener,noreferrer');
  };

  const handleRegenerate = async () => {
    setRegenerating(true);
    setLoadError('');
    try {
      const baseUrl = resolveAppBaseUrl();
      const cfg = await regenerateCheckInSiteToken(baseUrl);
      setConfig(cfg);
      setCopyHint('New QR code generated.');
      setTimeout(() => setCopyHint(''), 3000);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Could not regenerate QR code.');
    } finally {
      setRegenerating(false);
    }
  };

  const handleSavePhoneBase = () => {
    savePhoneBaseUrl(phoneBase);
    setCopyHint('Phone URL updated — QR refreshed.');
    setTimeout(() => setCopyHint(''), 3000);
  };

  const handlePrint = () => {
    if (!qrDataUrl || !posterUrl) return;
    setLoadError('');
    const siteName = config?.siteName ?? 'Main Office';
    const html = printPosterHtml(siteName, qrDataUrl, posterUrl);
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = 'none';
    document.body.appendChild(iframe);
    const doc = iframe.contentDocument ?? iframe.contentWindow?.document;
    if (!doc) {
      setLoadError('Could not open print view. Try again.');
      document.body.removeChild(iframe);
      return;
    }
    doc.open();
    doc.write(html);
    doc.close();
    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      setTimeout(() => {
        if (iframe.parentNode) document.body.removeChild(iframe);
      }, 1000);
    }, 300);
  };

  if (loading) {
    return (
      <div className="card hr-panel-card shadow-sm mb-4 p-4">
        <LoadingSpinner message="Loading check-in QR…" />
      </div>
    );
  }

  return (
    <div className="card hr-panel-card shadow-sm mb-4 hr-kiosk-panel">
      <div className="card-header py-3 border-bottom-0">
        <SectionHeader
          title="Office QR check-in"
          subtitle="Print a poster for employees — scan, enter phone or email, confirm name"
        />
      </div>
      <div className="card-body pt-0">
        {demoMode && (
          <div className="alert alert-warning py-2 small mb-3">
            Check-in is in <strong>demo mode</strong> (not connected to your employee database). Fully close STRATERA and run <code>start-stratera.bat</code> again.
          </div>
        )}

        {posterNeedsNetworkUrl && (
          <div className="alert alert-warning py-2 small mb-3">
            The QR link uses <code>localhost</code> — phones cannot open it. Enter your PC&apos;s Wi‑Fi address below (e.g. <code>192.168.0.40</code>) and click <strong>Apply</strong>.
          </div>
        )}

        {loadError && (
          <div className="alert alert-danger py-2 small mb-3 d-flex justify-content-between align-items-center gap-2">
            <span>{loadError}</span>
            <button type="button" className="btn btn-sm btn-outline-danger" onClick={load}>
              Retry
            </button>
          </div>
        )}

        {copyHint && (
          <div className="alert alert-success py-2 small mb-3" role="status">
            {copyHint}
          </div>
        )}

        <div className="hr-kiosk-layout">
          <div className="hr-kiosk-qr-card">
            <div className="hr-kiosk-qr-frame">
              {qrDataUrl ? (
                <img src={qrDataUrl} alt="Check-in QR code" className="hr-kiosk-qr-img" />
              ) : (
                <div className="hr-kiosk-qr-placeholder">QR unavailable</div>
              )}
            </div>
            <p className="hr-kiosk-site-label">{config?.siteName ?? 'Main Office'}</p>
            <div className="d-flex flex-wrap gap-2 justify-content-center mt-3">
              <Button size="sm" onClick={handlePrint} disabled={!qrDataUrl}>
                Print poster
              </Button>
              <Button size="sm" variant="outline" onClick={handleOpen} disabled={!posterUrl}>
                Open check-in page
              </Button>
            </div>
          </div>

          <div className="hr-kiosk-details">
            <h6 className="text-secondary mb-3">For employee phones (same Wi‑Fi)</h6>
            <p className="small text-muted mb-2">
              Phones cannot use <code>localhost</code>. Enter your PC&apos;s network address (shown in the terminal when STRATERA starts, e.g. <code>192.168.0.40</code>).
            </p>
            <label className="form-label small fw-semibold">Base URL for QR poster</label>
            <div className="input-group input-group-sm mb-2">
              <input
                type="url"
                className="form-control"
                placeholder={suggestedPhoneBaseUrl()}
                value={phoneBase}
                onChange={(e) => setPhoneBase(e.target.value)}
              />
              <button type="button" className="btn btn-outline-secondary" onClick={handleSavePhoneBase}>
                Apply
              </button>
            </div>

            <p className="small text-muted mb-2">
              Phone check-in API: <code className="user-select-all">{kioskHttpBaseUrl()}</code> (port 5192 — used when employees scan the QR)
            </p>

            <label className="form-label small fw-semibold mt-3">Check-in link on poster</label>
            <div className="hr-kiosk-url-box small user-select-all">{posterUrl || '—'}</div>

            <div className="d-flex flex-wrap gap-2 mt-3">
              <Button size="sm" onClick={handleCopy} disabled={!posterUrl}>
                Copy link
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleRegenerate}
                disabled={regenerating}
              >
                {regenerating ? 'Generating…' : 'New QR code'}
              </Button>
            </div>

            <div className="hr-kiosk-steps mt-4">
              <p className="small fw-semibold text-secondary mb-2">Employee steps</p>
              <ol className="small text-muted mb-0 ps-3">
                <li>Scan QR at the office entrance</li>
                <li>Enter phone number (must match HR employee record)</li>
                <li>Confirm your name → Check in or Check out</li>
              </ol>
            </div>
          </div>
        </div>

        {scanLog.length > 0 && (
          <div className="mt-4 pt-3 border-top">
            <h6 className="text-secondary mb-2">Recent scan activity</h6>
            <div className="table-responsive">
              <table className="table table-sm mb-0 align-middle">
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>Identifier</th>
                    <th>Outcome</th>
                    <th>Employee</th>
                  </tr>
                </thead>
                <tbody>
                  {scanLog.map((row) => (
                    <tr key={row.id}>
                      <td className="small text-muted">{new Date(row.timestamp).toLocaleString()}</td>
                      <td className="small">{row.identifier}</td>
                      <td className="small">
                        <span className="badge text-bg-light border">{row.outcome}</span>
                      </td>
                      <td className="small">{row.employeeName ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
