import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type {
  AccountingDashboardStats,
  Account,
  Transaction,
  Invoice,
} from '../api/types';
import { addBrandedHeader, addFooter, formatMoney, savePdf } from './branding';

interface ReportData {
  stats: AccountingDashboardStats;
  accounts: Account[];
  transactions: Transaction[];
  invoices: Invoice[];
}

export function exportFinancialReportPdf(reportName: string, data: ReportData): void {
  switch (reportName) {
    case 'Profit & Loss Statement':
      exportProfitLossPdf(data);
      break;
    case 'Balance Sheet':
      exportBalanceSheetPdf(data);
      break;
    case 'Cash Flow Statement':
      exportCashFlowPdf(data);
      break;
    case 'Accounts Aging Report':
      exportAgingPdf(data);
      break;
    case 'Expense Breakdown':
      exportExpenseBreakdownPdf(data);
      break;
    case 'Tax Summary Report':
      exportTaxSummaryPdf(data);
      break;
    default:
      exportProfitLossPdf(data);
  }
}

function exportProfitLossPdf(data: ReportData): void {
  const doc = new jsPDF();
  const startY = addBrandedHeader(doc, 'Profit & Loss Statement', 'Monthly Summary');

  autoTable(doc, {
    startY,
    head: [['Category', 'Amount']],
    body: [
      ['Total Revenue', formatMoney(data.stats.totalRevenue)],
      ['Total Expenses', formatMoney(data.stats.totalExpenses)],
      ['Net Profit', formatMoney(data.stats.netProfit)],
      ['Outstanding Invoices', formatMoney(data.stats.outstandingInvoices)],
    ],
    headStyles: { fillColor: [0, 27, 58], textColor: 255 },
  });

  const recentIncome = data.transactions.filter((t) => t.type === 'Income').slice(0, 8);
  if (recentIncome.length > 0) {
    autoTable(doc, {
      startY: (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 14,
      head: [['Date', 'Description', 'Amount']],
      body: recentIncome.map((t) => [t.date, t.description, formatMoney(t.amount)]),
      headStyles: { fillColor: [71, 85, 105] },
      styles: { fontSize: 9 },
    });
  }

  addFooter(doc);
  savePdf(doc, 'STRATERA-Profit-Loss.pdf');
}

function exportBalanceSheetPdf(data: ReportData): void {
  const doc = new jsPDF();
  const startY = addBrandedHeader(doc, 'Balance Sheet', `As of ${new Date().toLocaleDateString()}`);

  const byType = (type: string) => data.accounts.filter((a) => a.type === type);
  const assets = byType('Asset');
  const liabilities = byType('Liability');
  const income = byType('Income');
  const expenses = byType('Expense');

  const totalAssets = assets.reduce((s, a) => s + a.balance, 0);
  const totalLiabilities = liabilities.reduce((s, a) => s + a.balance, 0);

  autoTable(doc, {
    startY,
    head: [['Assets', 'Balance']],
    body: assets.map((a) => [a.name, formatMoney(a.balance)]),
    foot: [['Total Assets', formatMoney(totalAssets)]],
    headStyles: { fillColor: [0, 27, 58], textColor: 255 },
    footStyles: { fillColor: [241, 245, 249], textColor: [0, 27, 58], fontStyle: 'bold' },
  });

  autoTable(doc, {
    startY: (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10,
    head: [['Liabilities', 'Balance']],
    body: liabilities.map((a) => [a.name, formatMoney(a.balance)]),
    foot: [['Total Liabilities', formatMoney(totalLiabilities)]],
    headStyles: { fillColor: [0, 27, 58], textColor: 255 },
    footStyles: { fillColor: [241, 245, 249], textColor: [0, 27, 58], fontStyle: 'bold' },
  });

  autoTable(doc, {
    startY: (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10,
    head: [['Equity Summary', 'Amount']],
    body: [
      ['Revenue (YTD)', formatMoney(income.reduce((s, a) => s + a.balance, 0))],
      ['Expenses (YTD)', formatMoney(expenses.reduce((s, a) => s + a.balance, 0))],
      ['Net Equity', formatMoney(data.stats.netProfit)],
    ],
    headStyles: { fillColor: [0, 27, 58], textColor: 255 },
  });

  addFooter(doc);
  savePdf(doc, 'STRATERA-Balance-Sheet.pdf');
}

function exportCashFlowPdf(data: ReportData): void {
  const doc = new jsPDF();
  const startY = addBrandedHeader(doc, 'Cash Flow Statement', 'Monthly');

  const inflows = data.transactions.filter((t) => t.amount > 0);
  const outflows = data.transactions.filter((t) => t.amount < 0);
  const totalIn = inflows.reduce((s, t) => s + t.amount, 0);
  const totalOut = outflows.reduce((s, t) => s + Math.abs(t.amount), 0);

  autoTable(doc, {
    startY,
    head: [['Cash Inflows', 'Amount']],
    body: inflows.slice(0, 10).map((t) => [t.description, formatMoney(t.amount)]),
    foot: [['Total Inflows', formatMoney(totalIn)]],
    headStyles: { fillColor: [0, 27, 58], textColor: 255 },
  });

  autoTable(doc, {
    startY: (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10,
    head: [['Cash Outflows', 'Amount']],
    body: outflows.slice(0, 10).map((t) => [t.description, formatMoney(Math.abs(t.amount))]),
    foot: [['Total Outflows', formatMoney(totalOut)]],
    headStyles: { fillColor: [0, 27, 58], textColor: 255 },
  });

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  const netY = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 18;
  doc.text(`Net Cash Flow: ${formatMoney(totalIn - totalOut)}`, 14, netY);

  addFooter(doc);
  savePdf(doc, 'STRATERA-Cash-Flow.pdf');
}

function exportAgingPdf(data: ReportData): void {
  const doc = new jsPDF();
  const startY = addBrandedHeader(doc, 'Accounts Aging Report', 'Outstanding receivables');

  const outstanding = data.invoices.filter((i) => i.status === 'Sent' || i.status === 'Overdue');
  const today = new Date();

  const aged = outstanding.map((inv) => {
    const due = new Date(inv.dueDate);
    const days = Math.floor((today.getTime() - due.getTime()) / 86400000);
    let bracket = 'Current';
    if (days > 90) bracket = '90+ days';
    else if (days > 60) bracket = '61-90 days';
    else if (days > 30) bracket = '31-60 days';
    else if (days > 0) bracket = '1-30 days';
    return { ...inv, bracket, days: Math.max(0, days) };
  });

  autoTable(doc, {
    startY,
    head: [['Invoice', 'Client', 'Due Date', 'Days Overdue', 'Bracket', 'Amount']],
    body: aged.map((i) => [
      i.id,
      i.client,
      i.dueDate,
      String(i.days),
      i.bracket,
      formatMoney(i.amount),
    ]),
    headStyles: { fillColor: [0, 27, 58], textColor: 255 },
    styles: { fontSize: 9 },
  });

  addFooter(doc);
  savePdf(doc, 'STRATERA-Accounts-Aging.pdf');
}

function exportExpenseBreakdownPdf(data: ReportData): void {
  const doc = new jsPDF();
  const startY = addBrandedHeader(doc, 'Expense Breakdown', 'By account');

  const expenses = data.transactions.filter((t) => t.type === 'Expense');
  const byAccount: Record<string, number> = {};
  for (const t of expenses) {
    byAccount[t.account] = (byAccount[t.account] ?? 0) + Math.abs(t.amount);
  }

  autoTable(doc, {
    startY,
    head: [['Account', 'Total Expenses']],
    body: Object.entries(byAccount).map(([account, total]) => [account, formatMoney(total)]),
    foot: [['Total', formatMoney(Object.values(byAccount).reduce((s, v) => s + v, 0))]],
    headStyles: { fillColor: [0, 27, 58], textColor: 255 },
  });

  addFooter(doc);
  savePdf(doc, 'STRATERA-Expense-Breakdown.pdf');
}

function exportTaxSummaryPdf(data: ReportData): void {
  const doc = new jsPDF();
  const startY = addBrandedHeader(doc, 'Tax Summary Report', 'Quarterly estimate');

  const expenseTotal = data.stats.totalExpenses;
  const revenueTotal = data.stats.totalRevenue;
  const estimatedTax = revenueTotal * 0.21;

  autoTable(doc, {
    startY,
    head: [['Item', 'Amount']],
    body: [
      ['Gross Revenue', formatMoney(revenueTotal)],
      ['Total Expenses', formatMoney(expenseTotal)],
      ['Net Income', formatMoney(data.stats.netProfit)],
      ['Est. Corporate Tax (21%)', formatMoney(estimatedTax)],
      ['Outstanding Tax Liabilities', formatMoney(data.stats.outstandingInvoices * 0.1)],
    ],
    headStyles: { fillColor: [0, 27, 58], textColor: 255 },
  });

  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text('Tax estimates are illustrative. Consult your accountant for official filings.', 14,
    (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 14);

  addFooter(doc);
  savePdf(doc, 'STRATERA-Tax-Summary.pdf');
}
