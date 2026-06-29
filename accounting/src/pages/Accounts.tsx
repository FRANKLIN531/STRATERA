import { PageHeader, DataTable, Button, LoadingSpinner, useAsyncData, Icons } from '@stratera/shared';
import { getAccountingApi } from '../api';

const api = getAccountingApi();

export function Accounts() {
  const { data: accounts, loading } = useAsyncData(() => api.getAccounts());

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <PageHeader
        title="Accounts"
        subtitle="Manage your chart of accounts and balances"
        action={
          <Button>
            <Icons.Plus />
            New Account
          </Button>
        }
      />

      <DataTable
        columns={[
          { key: 'id', header: 'Account ID', width: '120px' },
          { key: 'name', header: 'Account Name' },
          { key: 'type', header: 'Type', width: '120px' },
          { key: 'currency', header: 'Currency', width: '100px' },
          { key: 'balance', header: 'Balance', width: '150px', render: (row) => (
            <span style={{ fontWeight: 600 }}>
              {row.balance.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
            </span>
          )},
        ]}
        data={accounts ?? []}
      />
    </div>
  );
}
