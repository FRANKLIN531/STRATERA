import { jsPDF } from 'jspdf';
import type { Invoice } from '../api/types';
import { addBrandedHeader, addFooter, formatMoney, savePdf } from './branding';

export function exportInvoicePdf(invoice: Invoice): void {
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
  doc.text(formatMoney(invoice.amount), 160, startY + 56);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(`Total Due: ${formatMoney(invoice.amount)}`, 14, startY + 76);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Thank you for your business.', 14, startY + 90);
  doc.text('STRATERA R&D Software Group', 14, startY + 98);

  addFooter(doc);
  savePdf(doc, `STRATERA-Invoice-${invoice.id}.pdf`);
}
