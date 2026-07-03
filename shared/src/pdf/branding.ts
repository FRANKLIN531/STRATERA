import type { jsPDF } from 'jspdf';

import { getActiveCurrency } from '../utils/currency';

export const PDF_NAVY: [number, number, number] = [0, 27, 58];

/**
 * ASCII-safe money formatting for PDFs.
 *
 * jsPDF's built-in Helvetica font uses WinAnsi encoding and cannot render
 * currency glyphs like the Ghana cedi (₵) or naira (₦), which produced garbled
 * output (e.g. "&G&H μ4&,&9..."). We use the ISO currency code plus a plain
 * grouped number so every currency renders cleanly.
 */
export function formatMoney(amount: number, currency?: string): string {
  const code = (currency ?? getActiveCurrency() ?? 'USD').toUpperCase();
  const value = Number.isFinite(amount) ? amount : 0;
  const grouped = value.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${code} ${grouped}`;
}

export function addBrandedHeader(doc: jsPDF, title: string, subtitle?: string): number {
  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setFillColor(...PDF_NAVY);
  doc.rect(0, 0, pageWidth, 32, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(15);
  doc.setFont('helvetica', 'bold');
  doc.text('STRATERA', 14, 14);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('R&D SOFTWARE GROUP', 14, 22);

  let y = 44;
  doc.setTextColor(...PDF_NAVY);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(title, 14, y);

  if (subtitle) {
    y += 8;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(subtitle, 14, y);
  }

  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'normal');
  return y + 14;
}

export function addFooter(doc: jsPDF): void {
  const pageCount = doc.getNumberOfPages();
  const pageHeight = doc.internal.pageSize.getHeight();
  const dateStr = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(`STRATERA  |  Generated ${dateStr}  |  Page ${i} of ${pageCount}`, 14, pageHeight - 10);
  }
}

export function savePdf(doc: jsPDF, filename: string): void {
  doc.save(filename);
}

/** Returns a `data:` URI suitable for an <iframe> preview. */
export function pdfDataUri(doc: jsPDF): string {
  return doc.output('datauristring');
}

/** Returns the raw base64 payload (no `data:` prefix) for email attachments. */
export function pdfBase64(doc: jsPDF): string {
  const uri = doc.output('datauristring');
  const comma = uri.indexOf(',');
  return comma >= 0 ? uri.slice(comma + 1) : uri;
}
