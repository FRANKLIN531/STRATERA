import { Button, LoadingSpinner, useAsyncData, exportFinancialReportPdf } from '@stratera/shared';
import { Icons } from '@stratera/shared';
import { getAccountingApi } from '../api';
import { MetricCard } from '../components/MetricCard';
import { SectionHeader } from '../components/SectionHeader';
import { formatCurrency } from '../utils/format';

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
    <div className="hr-page container-fluid px-0">
      <header className="hr-page-header">
        <div className="hr-page-header-row">
          <SectionHeader
            size="page"
            title="Financial Reports"
            subtitle="Generate and export professional PDF reports"
          />
        </div>
      </header>

      <div className="row row-cols-1 row-cols-sm-2 row-cols-xl-4 g-3 mb-4">
        <MetricCard
          label="Net Profit"
          value={formatCurrency(stats?.netProfit ?? 0)}
          meta={stats?.profitChange ?? 'Current period'}
          metaType="positive"
          accent="profit"
          icon={<Icons.TrendUp />}
          compactValue
        />
        <MetricCard
          label="Total Revenue"
          value={formatCurrency(stats?.totalRevenue ?? 0)}
          meta="Included in P&L"
          metaType="positive"
          accent="revenue"
          icon={<Icons.Dollar />}
          compactValue
        />
        <MetricCard
          label="Accounts"
          value={String((accounts ?? []).length)}
          meta="On balance sheet"
          accent="accounts"
          icon={<Icons.Accounts />}
        />
        <MetricCard
          label="Report Types"
          value={String(reports.length)}
          meta="Available for export"
          accent="reports"
          icon={<Icons.Reports />}
        />
      </div>

      <div className="card hr-panel-card shadow-sm mb-4">
        <div className="card-header py-3">
          <SectionHeader
            title="Available Reports"
            subtitle="Each report opens as a downloadable PDF with your live data"
          />
        </div>
        <div className="card-body">
          <div className="acc-report-grid">
            {reports.map((report) => (
              <article key={report.name} className="acc-report-card">
                <h3 className="acc-report-card__title">{report.name}</h3>
                <p className="acc-report-card__desc">{report.description}</p>
                <div className="acc-report-card__footer">
                  <span className="acc-report-card__period">{report.period}</span>
                  <Button size="sm" variant="outline" onClick={() => handleExport(report.name)}>
                    Export PDF
                  </Button>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
