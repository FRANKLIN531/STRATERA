import { Badge, Button, DataTable, LoadingSpinner, useAsyncData, Icons } from '@stratera/shared';
import { getAccountingApi } from '../api';
import { MetricCard } from '../components/MetricCard';
import { SectionHeader } from '../components/SectionHeader';
import { useAccountingNav } from '../context/AccountingNavContext';
import { formatCurrency } from '../utils/format';

const api = getAccountingApi();

const statusVariant = (status: string) => {
  switch (status) {
    case 'Paid': return 'success';
    case 'Overdue': return 'danger';
    case 'Sent': return 'info';
    default: return 'default';
  }
};

export function Dashboard() {
  const navigate = useAccountingNav();
  const { data: stats, loading: statsLoading } = useAsyncData(() => api.getDashboardStats());
  const { data: transactions, loading: txnLoading } = useAsyncData(() => api.getTransactions());
  const { data: invoices, loading: invLoading } = useAsyncData(() => api.getInvoices());
  const { data: accounts, loading: accLoading } = useAsyncData(() => api.getAccounts());

  if (statsLoading || txnLoading || invLoading || accLoading) return <LoadingSpinner />;

  const txnList = transactions ?? [];
  const invList = invoices ?? [];
  const recentTransactions = txnList.slice(0, 6);
  const recentInvoices = invList.slice(0, 5);
  const overdueCount = stats?.overdueInvoiceCount ?? invList.filter((i) => i.status === 'Overdue').length;
  const cashBalance = (accounts ?? []).find((a) => a.name === 'Cash & Bank')?.balance ?? 0;
  const profitMargin = stats && stats.totalRevenue > 0
    ? Math.round((stats.netProfit / stats.totalRevenue) * 100)
    : 0;

  return (
    <div className="hr-page container-fluid px-0">
      <header className="hr-page-header">
        <div className="hr-page-header-row">
          <SectionHeader
            size="page"
            title="Financial Overview"
            subtitle="Monitor revenue, expenses, and cash flow at a glance"
          />
          <div className="hr-page-actions d-flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => navigate('transactions')}>
              <Icons.Plus /> New Transaction
            </Button>
            <Button size="sm" variant="outline" onClick={() => navigate('invoices')}>
              <Icons.Plus /> Create Invoice
            </Button>
            <Button size="sm" variant="outline" onClick={() => navigate('reports')}>
              <Icons.Reports /> Reports
            </Button>
          </div>
        </div>
      </header>

      {overdueCount > 0 && (
        <div className="alert alert-danger border-0 shadow-sm mb-4 py-2 px-3 d-flex align-items-center justify-content-between flex-wrap gap-2" role="alert">
          <span className="small">
            <strong>{overdueCount}</strong> overdue invoice{overdueCount === 1 ? '' : 's'} need attention.
          </span>
          <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => navigate('invoices')}>
            Review invoices
          </button>
        </div>
      )}

      <div className="row row-cols-1 row-cols-sm-2 row-cols-xl-4 g-3 mb-4">
        <MetricCard
          label="Total Revenue"
          value={formatCurrency(stats?.totalRevenue ?? 0)}
          meta={stats?.revenueChange ?? 'Income accounts'}
          metaType="positive"
          accent="revenue"
          icon={<Icons.Dollar />}
          compactValue
        />
        <MetricCard
          label="Total Expenses"
          value={formatCurrency(stats?.totalExpenses ?? 0)}
          meta={stats?.expenseChange ?? 'Expense accounts'}
          metaType="neutral"
          accent="expenses"
          icon={<Icons.Transactions />}
          compactValue
        />
        <MetricCard
          label="Net Profit"
          value={formatCurrency(stats?.netProfit ?? 0)}
          meta={`${profitMargin}% margin · ${stats?.profitChange ?? ''}`}
          metaType={(stats?.netProfit ?? 0) >= 0 ? 'positive' : 'neutral'}
          accent="profit"
          icon={<Icons.TrendUp />}
          compactValue
        />
        <MetricCard
          label="Cash & Bank"
          value={formatCurrency(cashBalance)}
          meta={`${stats?.pendingInvoiceCount ?? 0} invoices outstanding`}
          metaType="neutral"
          accent="accounts"
          icon={<Icons.Accounts />}
          compactValue
        />
      </div>

      <div className="row g-4">
        <div className="col-xl-7">
          <div className="card hr-panel-card hr-directory-card shadow-sm h-100">
            <div className="card-header py-3 d-flex align-items-center justify-content-between">
              <SectionHeader
                title="Recent Transactions"
                subtitle="Latest ledger activity"
              />
              <button type="button" className="btn btn-sm btn-link text-decoration-none" onClick={() => navigate('transactions')}>
                View all
              </button>
            </div>
            <div className="card-body p-0">
              {recentTransactions.length === 0 ? (
                <p className="small text-muted p-4 mb-0">No transactions yet. Record your first income or expense.</p>
              ) : (
                <DataTable
                  columns={[
                    { key: 'date', header: 'Date', width: '100px' },
                    { key: 'description', header: 'Description' },
                    {
                      key: 'type',
                      header: 'Type',
                      width: '90px',
                      render: (row) => (
                        <Badge variant={row.type === 'Income' ? 'success' : 'danger'}>{row.type as string}</Badge>
                      ),
                    },
                    {
                      key: 'amount',
                      header: 'Amount',
                      width: '120px',
                      render: (row) => (
                        <span className={(row.amount as number) > 0 ? 'acc-amount-positive' : 'acc-amount-negative'}>
                          {formatCurrency(row.amount as number)}
                        </span>
                      ),
                    },
                  ]}
                  data={recentTransactions as unknown as Record<string, unknown>[]}
                />
              )}
            </div>
          </div>
        </div>

        <div className="col-xl-5">
          <div className="card hr-panel-card shadow-sm h-100">
            <div className="card-header py-3 d-flex align-items-center justify-content-between">
              <SectionHeader
                title="Recent Invoices"
                subtitle="Client billing status"
              />
              <button type="button" className="btn btn-sm btn-link text-decoration-none" onClick={() => navigate('invoices')}>
                View all
              </button>
            </div>
            <div className="card-body p-0">
              {recentInvoices.length === 0 ? (
                <p className="small text-muted p-4 mb-0">No invoices yet. Create one to bill a client.</p>
              ) : (
                <ul className="list-group list-group-flush acc-recent-invoices">
                  {recentInvoices.map((inv) => (
                    <li key={inv.id} className="list-group-item d-flex align-items-center justify-content-between gap-2 py-3">
                      <div className="min-w-0">
                        <div className="fw-semibold small text-truncate">{inv.client}</div>
                        <div className="text-muted" style={{ fontSize: 11 }}>{inv.id} · due {inv.dueDate}</div>
                      </div>
                      <div className="text-end flex-shrink-0">
                        <div className="small fw-semibold">{formatCurrency(inv.amount)}</div>
                        <Badge variant={statusVariant(inv.status)}>{inv.status}</Badge>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
