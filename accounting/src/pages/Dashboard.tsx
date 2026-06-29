import { StatCard, PageHeader, DataTable, Badge, LoadingSpinner, useAsyncData, strateraTheme } from '@stratera/shared';
import { Icons } from '@stratera/shared';
import { getAccountingApi } from '../api';

const api = getAccountingApi();
const formatCurrency = (n: number) => n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });

export function Dashboard() {
  const { data: stats, loading: statsLoading } = useAsyncData(() => api.getDashboardStats());
  const { data: transactions, loading: txnLoading } = useAsyncData(() => api.getTransactions());

  if (statsLoading || txnLoading) return <LoadingSpinner />;

  const recentTransactions = (transactions ?? []).slice(0, 5);

  return (
    <div>
      <PageHeader
        title="Financial Overview"
        subtitle="Monitor your company's financial health at a glance"
      />

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: 20,
          marginBottom: 32,
        }}
      >
        <StatCard
          label="Total Revenue"
          value={formatCurrency(stats?.totalRevenue ?? 0)}
          change={stats?.revenueChange}
          changeType="positive"
          icon={<Icons.Dollar />}
        />
        <StatCard
          label="Total Expenses"
          value={formatCurrency(stats?.totalExpenses ?? 0)}
          change={stats?.expenseChange}
          changeType="negative"
          icon={<Icons.Transactions />}
        />
        <StatCard
          label="Net Profit"
          value={formatCurrency(stats?.netProfit ?? 0)}
          change={stats?.profitChange}
          changeType="positive"
          icon={<Icons.TrendUp />}
        />
        <StatCard
          label="Outstanding Invoices"
          value={formatCurrency(stats?.outstandingInvoices ?? 0)}
          change={`${stats?.pendingInvoiceCount ?? 0} invoices pending`}
          changeType="neutral"
          icon={<Icons.Invoices />}
        />
      </div>

      <div style={{ marginBottom: 16 }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, color: strateraTheme.colors.navy }}>
          Recent Transactions
        </h3>
      </div>

      <DataTable
        columns={[
          { key: 'id', header: 'ID', width: '120px' },
          { key: 'date', header: 'Date', width: '110px' },
          { key: 'description', header: 'Description' },
          { key: 'type', header: 'Type', width: '100px', render: (row) => (
            <Badge variant={row.type === 'Income' ? 'success' : 'danger'}>{row.type}</Badge>
          )},
          { key: 'amount', header: 'Amount', width: '120px', render: (row) => (
            <span style={{ fontWeight: 600, color: row.amount > 0 ? strateraTheme.colors.success : strateraTheme.colors.danger }}>
              {row.amount > 0 ? '+' : ''}{formatCurrency(row.amount)}
            </span>
          )},
          { key: 'status', header: 'Status', width: '110px', render: (row) => (
            <Badge variant={row.status === 'Completed' ? 'success' : 'warning'}>{row.status}</Badge>
          )},
        ]}
        data={recentTransactions}
      />
    </div>
  );
}
