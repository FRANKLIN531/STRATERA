import { Badge, DataTable, LoadingSpinner, useAsyncData, Icons } from '@stratera/shared';
import { getAccountingApi } from '../api';
import { MetricCard } from '../components/MetricCard';
import { SectionHeader } from '../components/SectionHeader';
import { formatCurrency } from '../utils/format';

const api = getAccountingApi();

export function Dashboard() {
  const { data: stats, loading: statsLoading } = useAsyncData(() => api.getDashboardStats());
  const { data: transactions, loading: txnLoading } = useAsyncData(() => api.getTransactions());

  if (statsLoading || txnLoading) return <LoadingSpinner />;

  const recentTransactions = (transactions ?? []).slice(0, 8);
  const incomeCount = (transactions ?? []).filter((t) => t.type === 'Income').length;
  const expenseCount = (transactions ?? []).filter((t) => t.type === 'Expense').length;

  return (
    <div className="hr-page container-fluid px-0">
      <header className="hr-page-header">
        <div className="hr-page-header-row">
          <SectionHeader
            size="page"
            title="Financial Overview"
            subtitle="Monitor revenue, expenses, and cash flow at a glance"
          />
        </div>
      </header>

      <div className="row row-cols-1 row-cols-sm-2 row-cols-xl-4 g-3 mb-4">
        <MetricCard
          label="Total Revenue"
          value={formatCurrency(stats?.totalRevenue ?? 0)}
          meta={stats?.revenueChange ?? 'Year to date'}
          metaType="positive"
          accent="revenue"
          icon={<Icons.Dollar />}
          compactValue
        />
        <MetricCard
          label="Total Expenses"
          value={formatCurrency(stats?.totalExpenses ?? 0)}
          meta={stats?.expenseChange ?? 'Year to date'}
          metaType="neutral"
          accent="expenses"
          icon={<Icons.Transactions />}
          compactValue
        />
        <MetricCard
          label="Net Profit"
          value={formatCurrency(stats?.netProfit ?? 0)}
          meta={stats?.profitChange ?? 'After expenses'}
          metaType="positive"
          accent="profit"
          icon={<Icons.TrendUp />}
          compactValue
        />
        <MetricCard
          label="Outstanding Invoices"
          value={formatCurrency(stats?.outstandingInvoices ?? 0)}
          meta={`${stats?.pendingInvoiceCount ?? 0} invoices pending`}
          metaType="neutral"
          accent="invoices"
          icon={<Icons.Invoices />}
          compactValue
        />
      </div>

      <div className="alert alert-light border shadow-sm mb-4 py-2 px-3" role="note">
        <span className="small text-secondary">
          <strong>{incomeCount}</strong> income and <strong>{expenseCount}</strong> expense transactions on record.
          Use Transactions for full ledger management and Reports for PDF exports.
        </span>
      </div>

      <div className="card hr-panel-card hr-directory-card shadow-sm">
        <div className="card-header py-3">
          <SectionHeader
            title="Recent Transactions"
            subtitle="Latest activity across all accounts"
          />
        </div>
        <div className="card-body p-0">
          <DataTable
            columns={[
              { key: 'id', header: 'ID', width: '120px' },
              { key: 'date', header: 'Date', width: '110px' },
              { key: 'description', header: 'Description' },
              {
                key: 'type',
                header: 'Type',
                width: '100px',
                render: (row) => (
                  <Badge variant={row.type === 'Income' ? 'success' : 'danger'}>{row.type as string}</Badge>
                ),
              },
              {
                key: 'amount',
                header: 'Amount',
                width: '130px',
                render: (row) => (
                  <span className={(row.amount as number) > 0 ? 'acc-amount-positive' : 'acc-amount-negative'}>
                    {(row.amount as number) > 0 ? '+' : ''}
                    {formatCurrency(row.amount as number)}
                  </span>
                ),
              },
              {
                key: 'status',
                header: 'Status',
                width: '110px',
                render: (row) => (
                  <Badge variant={row.status === 'Completed' ? 'success' : 'warning'}>{row.status as string}</Badge>
                ),
              },
            ]}
            data={recentTransactions as unknown as Record<string, unknown>[]}
          />
        </div>
        <div className="card-footer hr-directory-footer py-2 px-3">
          <span className="small text-muted">
            Showing {recentTransactions.length} of {(transactions ?? []).length} transactions
          </span>
        </div>
      </div>
    </div>
  );
}
