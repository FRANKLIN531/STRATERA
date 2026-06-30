import { useMemo, useState } from 'react';
import { Button, LoadingSpinner, useAsyncData, usePagination, Select } from '@stratera/shared';
import { Icons } from '@stratera/shared';
import { getAccountingApi } from '../api';
import { MetricCard } from '../components/MetricCard';
import { SectionHeader } from '../components/SectionHeader';
import { EmptyState } from '../components/EmptyState';
import { TablePagination } from '../components/TablePagination';
import { formatCurrency } from '../utils/format';
import { SearchIcon } from '../components/SearchIcon';

const api = getAccountingApi();

function accountTypeClass(type: string): string {
  const t = type.toLowerCase();
  if (t.includes('asset')) return 'acc-account-type-pill acc-account-type-pill--asset';
  if (t.includes('liabilit')) return 'acc-account-type-pill acc-account-type-pill--liability';
  if (t.includes('equity')) return 'acc-account-type-pill acc-account-type-pill--equity';
  if (t.includes('income') || t.includes('revenue')) return 'acc-account-type-pill acc-account-type-pill--income';
  if (t.includes('expense')) return 'acc-account-type-pill acc-account-type-pill--expense';
  return 'acc-account-type-pill';
}

export function Accounts() {
  const { data: accounts, loading } = useAsyncData(() => api.getAccounts());
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  const list = accounts ?? [];

  const types = useMemo(
    () => [...new Set(list.map((a) => a.type))].sort(),
    [list],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return list.filter((a) => {
      if (typeFilter && a.type !== typeFilter) return false;
      if (!q) return true;
      return a.id.toLowerCase().includes(q) || a.name.toLowerCase().includes(q) || a.type.toLowerCase().includes(q);
    });
  }, [list, search, typeFilter]);

  const {
    page, setPage, totalPages, paginated, from, to, total,
  } = usePagination(filtered, 12);

  const totalBalance = list.reduce((s, a) => s + a.balance, 0);
  const assetCount = list.filter((a) => a.type.toLowerCase().includes('asset')).length;
  const liabilityCount = list.filter((a) => a.type.toLowerCase().includes('liabilit')).length;

  if (loading) return <LoadingSpinner />;

  return (
    <div className="hr-page container-fluid px-0">
      <header className="hr-page-header">
        <div className="hr-page-header-row">
          <SectionHeader
            size="page"
            title="Chart of Accounts"
            subtitle="Manage accounts, types, and running balances"
          />
          <div className="hr-page-actions">
            <Button disabled title="Account creation coming soon">
              <Icons.Plus />
              New Account
            </Button>
          </div>
        </div>
      </header>

      <div className="row row-cols-1 row-cols-sm-2 row-cols-xl-4 g-3 mb-4">
        <MetricCard
          label="Total Accounts"
          value={String(list.length)}
          meta="Active ledger accounts"
          accent="accounts"
          icon={<Icons.Accounts />}
        />
        <MetricCard
          label="Combined Balance"
          value={formatCurrency(totalBalance)}
          meta="Across all accounts"
          accent="profit"
          icon={<Icons.Dollar />}
          compactValue
        />
        <MetricCard
          label="Asset Accounts"
          value={String(assetCount)}
          meta="Cash, receivables, etc."
          metaType="positive"
          accent="revenue"
          icon={<Icons.Accounts />}
        />
        <MetricCard
          label="Liability Accounts"
          value={String(liabilityCount)}
          meta="Payables and loans"
          accent="expenses"
          icon={<Icons.Accounts />}
        />
      </div>

      <div className="card hr-panel-card hr-directory-card shadow-sm">
        <div className="card-header py-3">
          <div className="row g-3 align-items-center">
            <div className="col-lg-4">
              <SectionHeader
                title="Account Directory"
                subtitle="Search and filter your chart of accounts"
              />
            </div>
            <div className="col-lg-8">
              <div className="row g-2">
                <div className="col-md-7">
                  <div className="input-group input-group-sm hr-directory-search">
                    <span className="input-group-text bg-white"><SearchIcon /></span>
                    <input
                      type="search"
                      className="form-control"
                      placeholder="Search account name or ID..."
                      value={search}
                      onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                    />
                  </div>
                </div>
                <div className="col-md-5">
                  <Select
                    size="sm"
                    value={typeFilter}
                    onChange={(v) => { setTypeFilter(v); setPage(1); }}
                    options={[
                      { value: '', label: 'All account types' },
                      ...types.map((t) => ({ value: t, label: t })),
                    ]}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="hr-empty-state-panel p-4">
            <EmptyState
              accent="accounts"
              title={list.length === 0 ? 'No accounts found' : 'No matching accounts'}
              description="Accounts are seeded on first launch. Adjust your search or type filter."
            />
          </div>
        ) : (
          <>
            <div className="table-responsive">
              <table className="table table-hover hr-directory-table mb-0">
                <thead>
                  <tr>
                    <th>Account ID</th>
                    <th>Account Name</th>
                    <th>Type</th>
                    <th>Currency</th>
                    <th>Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((row) => (
                    <tr key={row.id}>
                      <td><span className="hr-emp-id">{row.id}</span></td>
                      <td><span className="hr-emp-name">{row.name}</span></td>
                      <td><span className={accountTypeClass(row.type)}>{row.type}</span></td>
                      <td>{row.currency}</td>
                      <td>
                        <span className={row.balance >= 0 ? 'acc-amount-positive' : 'acc-amount-negative'}>
                          {formatCurrency(row.balance)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <TablePagination
              page={page}
              totalPages={totalPages}
              from={from}
              to={to}
              total={total}
              onPageChange={setPage}
            />
          </>
        )}
      </div>
    </div>
  );
}
