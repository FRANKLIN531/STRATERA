import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { PayrollRecord } from '../api/types';
import { addBrandedHeader, addFooter, formatMoney, savePdf } from './branding';

export function exportPayrollPdf(records: PayrollRecord[], period?: string): void {
  const doc = new jsPDF();
  const periodLabel = period ?? new Date().toISOString().slice(0, 7);
  const startY = addBrandedHeader(doc, 'Payroll Report', `Period: ${periodLabel}`);

  const totalGross = records.reduce((s, r) => s + r.baseSalary + r.bonus, 0);
  const totalNet = records.reduce((s, r) => s + r.netPay, 0);
  const totalDeductions = records.reduce((s, r) => s + r.deductions, 0);

  doc.setFontSize(10);
  doc.text(`Employees: ${records.length}`, 14, startY);
  doc.text(`Total Gross: ${formatMoney(totalGross)}`, 14, startY + 7);
  doc.text(`Total Deductions: ${formatMoney(totalDeductions)}`, 14, startY + 14);
  doc.text(`Total Net Pay: ${formatMoney(totalNet)}`, 14, startY + 21);

  autoTable(doc, {
    startY: startY + 30,
    head: [['Employee', 'Department', 'Base', 'Bonus', 'Deductions', 'Net Pay', 'Status']],
    body: records.map((r) => [
      r.employee,
      r.department,
      formatMoney(r.baseSalary),
      formatMoney(r.bonus),
      formatMoney(r.deductions),
      formatMoney(r.netPay),
      r.status,
    ]),
    headStyles: { fillColor: [0, 27, 58], textColor: 255 },
    styles: { fontSize: 9 },
  });

  addFooter(doc);
  savePdf(doc, `STRATERA-Payroll-${periodLabel}.pdf`);
}
