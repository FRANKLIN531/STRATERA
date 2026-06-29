import { PageHeader, Button, LoadingSpinner, useAsyncData, strateraTheme, exportFinancialReportPdf } from '@stratera/shared';
import { getAccountingApi } from '../api';

const api = getAccountingApi();

const reports = [
  { name: 'Profit & Loss Statement', description: 'Revenue, expenses, and net income summary', period: 'Monthly' },
  { name: 'Balance Sheet', description: 'Assets, liabilities, and equity overview', period: 'Monthly' },
  { name: 'Cash Flow Statement', description: 'Cash inflows and outflows analysis', period: 'Monthly' },
  { name: 'Accounts Aging Report', description: 'Outstanding receivables by age bracket', period: 'Weekly' },
  { name: 'Expense Breakdown', description: 'Categorized expense analysis', period: 'Monthly' },
  { name: 'Tax Summary Report', description: 'Tax liabilities and deductions summary', period: 'Quarterly' },
];

export function Reports() {
  const { data: stats, loading: statsLoading } = useAsyncData(() => api.getDashboardStats());
  const { data: accounts, loading: accountsLoading } = useAsyncData(() => api.getAccounts());
  const { data: transactions, loading: txnLoading } = useAsyncData(() => api.getTransactions());
  const { data: invoices, loading: invLoading } = useAsyncData(() => api.getInvoices());

  const loading = statsLoading || accountsLoading || txnLoading || invLoading;

  const handleExport = (reportName: string) => {
    if (!stats || !accounts || !transactions || !invoices) return;
    exportFinancialReportPdf(reportName, { stats, accounts, transactions, invoices });
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <PageHeader
        title="Financial Reports"
        subtitle="Generate and export PDF financial reports"
      />

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
          gap: 20,
        }}
      >
        {reports.map((report) => (
          <div
            key={report.name}
            style={{
              background: strateraTheme.colors.white,
              borderRadius: 12,
              padding: 24,
              border: `1px solid ${strateraTheme.colors.gray200}`,
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
            }}
          >
            <h3 style={{ fontSize: 16, fontWeight: 600, color: strateraTheme.colors.navy }}>
              {report.name}
            </h3>
            <p style={{ fontSize: 14, color: strateraTheme.colors.gray500, flex: 1 }}>
              {report.description}
            </p>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 12, color: strateraTheme.colors.gray400, fontWeight: 500 }}>
                {report.period}
              </span>
              <Button size="sm" variant="outline" onClick={() => handleExport(report.name)}>
                Export PDF
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
