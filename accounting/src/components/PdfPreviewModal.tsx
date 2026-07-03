import type { CSSProperties, ReactNode } from 'react';
import { useEffect } from 'react';

interface PdfPreviewModalProps {
  title: string;
  subtitle?: string;
  dataUri: string;
  onClose: () => void;
  onDownload: () => void;
  downloadLabel?: string;
  /** Optional controls rendered in the right-hand side panel. */
  children?: ReactNode;
}

const overlayStyle: CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(2, 11, 26, 0.55)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1080,
  padding: 24,
};

const cardStyle: CSSProperties = {
  background: '#fff',
  borderRadius: 12,
  width: 'min(1040px, 96vw)',
  height: 'min(760px, 92vh)',
  display: 'flex',
  flexDirection: 'column',
  boxShadow: '0 24px 60px rgba(0, 0, 0, 0.35)',
  overflow: 'hidden',
};

export function PdfPreviewModal({
  title,
  subtitle,
  dataUri,
  onClose,
  onDownload,
  downloadLabel = 'Download PDF',
  children,
}: PdfPreviewModalProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div style={overlayStyle} onClick={onClose} role="presentation">
      <div style={cardStyle} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div
          className="d-flex align-items-center justify-content-between px-4 py-3"
          style={{ borderBottom: '1px solid #e2e8f0', background: '#001B3A', color: '#fff' }}
        >
          <div>
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>{title}</h2>
            {subtitle && (
              <p style={{ margin: '2px 0 0', fontSize: 12, opacity: 0.75 }}>{subtitle}</p>
            )}
          </div>
          <button
            type="button"
            className="btn btn-sm btn-light"
            onClick={onClose}
            aria-label="Close preview"
          >
            Close
          </button>
        </div>

        <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
          <div style={{ flex: 1, minWidth: 0, background: '#525659' }}>
            <iframe
              title="PDF preview"
              src={dataUri}
              style={{ width: '100%', height: '100%', border: 'none' }}
            />
          </div>
          {children && (
            <div
              style={{
                width: 340,
                borderLeft: '1px solid #e2e8f0',
                padding: 20,
                overflowY: 'auto',
                background: '#fff',
              }}
            >
              {children}
            </div>
          )}
        </div>

        <div
          className="d-flex align-items-center justify-content-end gap-2 px-4 py-3"
          style={{ borderTop: '1px solid #e2e8f0', background: '#f8fafc' }}
        >
          <button type="button" className="btn btn-outline-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary" onClick={onDownload}>
            {downloadLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
