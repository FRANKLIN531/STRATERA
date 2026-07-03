import { useMemo, useState } from 'react';
import {
  Button, LoadingSpinner, useAsyncData, usePagination, Select,
  Modal, formFieldStyle, ConfirmDialog, Icons,
} from '@stratera/shared';
import type { Account, CreateAccountInput } from '@stratera/shared';
import { getAccountingApi } from '../api';
import { MetricCard } from '../components/MetricCard';
import { SectionHeader } from '../components/SectionHeader';
import { EmptyState } from '../components/EmptyState';
import { TablePagination } from '../components/TablePagination';
import { formatCurrency } from '../utils/format';
import { SearchIcon } from '../components/SearchIcon';

const api = getAccountingApi();

const ACCOUNT_TYPES: CreateAccountInput['type'][] = [
  'Asset', 'Liability', 'Equity', 'Income', 'Expense',
];

const CURRENCIES = [
  { value: 'USD', label: 'USD — US Dollar' },
  { value: 'GHS', label: 'GHS — Ghana Cedi' },
  { value: 'EUR', label: 'EUR — Euro' },
  { value: 'GBP', label: 'GBP — British Pound' },
];

const PROTECTED_ACCOUNTS = ['Cash & Bank', 'Operating Expenses'];

const emptyForm: CreateAccountInput = {
  name: '',
  type: 'Asset',
  currency: 'USD',
};

function accountTypeClass(type: string): string {
  const t = type.toLowerCase();
  if (t.includes('asset')) return 'acc-account-type-pill acc-account-type-pill--asset';
  if (t.includes('liabilit')) return 'acc-account-type-pill acc-account-type-pill--liability';
  if (t.includes('equity')) return 'acc-account-type-pill acc-account-type-pill--equity';
  if (t.includes('income') || t.includes('revenue')) return 'acc-account-type-pill acc-account-type-pill--income';
  if (t.includes('expense')) return 'acc-account-type-pill acc-account-type-pill--expense';
  return 'acc-account-type-pill';
}

function isProtectedAccount(name: string): boolean {
  return PROTECTED_ACCOUNTS.includes(name);
}

export function Accounts() {
  const { data: accounts, loading, reload } = useAsyncData(() => api.getAccounts());
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<CreateAccountInput>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<Account | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

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
  const defaultCurrency = list[0]?.currency ?? 'USD';

  const openCreate = () => {
    setEditingId(null);
    setForm({ ...emptyForm, currency: defaultCurrency });
    setFormError('');
    setShowForm(true);
  };

  const openEdit = (acc: Account) => {
    setEditingId(acc.id);
    setForm({
      name: acc.name,
      type: acc.type as CreateAccountInput['type'],
      currency: acc.currency,
    });
    setFormError('');
    setShowForm(true);
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      setFormError('Account name is required.');
      return;
    }
    setSaving(true);
    setFormError('');
    try {
      if (editingId) {
        await api.updateAccount(editingId, form);
      } else {
        await api.createAccount(form);
      }
      setShowForm(false);
      setEditingId(null);
      setForm(emptyForm);
      reload();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Could not save account.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError('');
    try {
      await api.deleteAccount(deleteTarget.id);
      setDeleteTarget(null);
      reload();
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Could not delete account.');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  const editingProtected = editingId
    ? isProtectedAccount(list.find((a) => a.id === editingId)?.name ?? '')
    : false;

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
            <Button onClick={openCreate}>
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
          value={formatCurrency(totalBalance, defaultCurrency)}
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
              title={list.length === 0 ? 'No accounts yet' : 'No matching accounts'}
              description={
                list.length === 0
                  ? 'Create ledger accounts to track assets, liabilities, income, and expenses.'
                  : 'Adjust your search or type filter.'
              }
              actionLabel={list.length === 0 ? 'New Account' : undefined}
              actionIcon={list.length === 0 ? <Icons.Plus /> : undefined}
              onAction={list.length === 0 ? openCreate : undefined}
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
                    <th />
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
                          {formatCurrency(row.balance, row.currency)}
                        </span>
                      </td>
                      <td>
                        <div className="hr-table-actions">
                          <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => openEdit(row)}>Edit</button>
                          <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => { setDeleteError(''); setDeleteTarget(row); }}>Delete</button>
                        </div>
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

      {showForm && (
        <Modal
          title={editingId ? 'Edit Account' : 'New Account'}
          onClose={() => { setShowForm(false); setEditingId(null); setFormError(''); }}
          onSubmit={handleSubmit}
          loading={saving}
          submitLabel={editingId ? 'Save Changes' : 'Create Account'}
        >
          {formError && (
            <p className="alert alert-danger py-2 small" role="alert">{formError}</p>
          )}
          <div style={formFieldStyle.grid}>
            <label style={formFieldStyle.field}>
              <span style={formFieldStyle.label}>Account Name</span>
              <input
                type="text"
                style={formFieldStyle.input}
                value={form.name}
                readOnly={editingProtected}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
              {editingProtected && (
                <span className="small text-muted">System account names cannot be changed.</span>
              )}
            </label>
            <label style={formFieldStyle.field}>
              <span style={formFieldStyle.label}>Account Type</span>
              <Select
                value={form.type}
                onChange={(type) => setForm({ ...form, type: type as CreateAccountInput['type'] })}
                options={ACCOUNT_TYPES.map((t) => ({ value: t, label: t }))}
              />
            </label>
            <label style={formFieldStyle.field}>
              <span style={formFieldStyle.label}>Currency</span>
              <Select
                value={form.currency ?? 'USD'}
                onChange={(currency) => setForm({ ...form, currency: currency ?? 'USD' })}
                options={CURRENCIES}
              />
            </label>
          </div>
          {!editingId && (
            <p className="small text-muted mt-2 mb-0">
              New accounts start with a zero balance. Post transactions to update balances.
            </p>
          )}
        </Modal>
      )}

      {deleteTarget && (
        <ConfirmDialog
          title="Delete account?"
          message={`Remove "${deleteTarget.name}" from your chart of accounts? This only works if the balance is zero and no transactions use this account.`}
          confirmLabel="Delete"
          error={deleteError}
          onConfirm={handleDelete}
          onCancel={() => { setDeleteTarget(null); setDeleteError(''); }}
          loading={deleting}
        />
      )}
    </div>
  );
}
