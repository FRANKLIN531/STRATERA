import { jsPDF } from 'jspdf';
import type { Invoice } from '../api/types';
import { addBrandedHeader, addFooter, formatMoney, savePdf, pdfDataUri, pdfBase64 } from './branding';

export interface InvoicePdfOptions {
  /** Optional free-text note printed under the line items. */
  note?: string;
  /** Currency override; defaults to the active accounting currency. */
  currency?: string;
}

export function invoicePdfFilename(invoice: Invoice): string {
  return `STRATERA-Invoice-${invoice.id}.pdf`;
}

/** Build (but do not save) the branded invoice PDF document. */
export function buildInvoicePdf(invoice: Invoice, options: InvoicePdfOptions = {}): jsPDF {
  const doc = new jsPDF();
  const startY = addBrandedHeader(doc, 'INVOICE', invoice.id);

  doc.setFontSize(11);
  doc.text(`Bill To: ${invoice.client}`, 14, startY);
  doc.text(`Issue Date: ${invoice.date}`, 14, startY + 8);
  doc.text(`Due Date: ${invoice.dueDate}`, 14, startY + 16);
  doc.text(`Status: ${invoice.status}`, 14, startY + 24);

  doc.setDrawColor(226, 232, 240);
  doc.line(14, startY + 32, 196, startY + 32);

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Description', 14, startY + 44);
  doc.text('Amount', 160, startY + 44);

  doc.setFont('helvetica', 'normal');
  doc.text('Professional services', 14, startY + 56);
  doc.text(formatMoney(invoice.amount, options.currency), 160, startY + 56);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(`Total Due: ${formatMoney(invoice.amount, options.currency)}`, 14, startY + 76);

  let cursorY = startY + 90;
  const note = options.note?.trim();
  if (note) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.text('Notes', 14, cursorY);
    cursorY += 6;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(60, 72, 88);
    const wrapped = doc.splitTextToSize(note, 182);
    doc.text(wrapped, 14, cursorY);
    cursorY += wrapped.length * 5 + 8;
  }

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Thank you for your business.', 14, cursorY);
  doc.text('STRATERA R&D Software Group', 14, cursorY + 8);

  addFooter(doc);
  return doc;
}

export function exportInvoicePdf(invoice: Invoice, options: InvoicePdfOptions = {}): void {
  savePdf(buildInvoicePdf(invoice, options), invoicePdfFilename(invoice));
}

/** `data:` URI for previewing the invoice in an iframe. */
export function getInvoicePdfDataUri(invoice: Invoice, options: InvoicePdfOptions = {}): string {
  return pdfDataUri(buildInvoicePdf(invoice, options));
}

/** Raw base64 payload (no prefix) for email attachments. */
export function getInvoicePdfBase64(invoice: Invoice, options: InvoicePdfOptions = {}): string {
  return pdfBase64(buildInvoicePdf(invoice, options));
}
