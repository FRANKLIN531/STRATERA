import { useMemo, useState } from 'react';
import {
  Button, Badge, LoadingSpinner, useAsyncData, usePagination,
  Modal, formFieldStyle, Icons, ConfirmDialog, Select,
} from '@stratera/shared';
import type { CreateTransactionInput, Transaction } from '@stratera/shared';
import { getAccountingApi } from '../api';
import { MetricCard } from '../components/MetricCard';
import { SectionHeader } from '../components/SectionHeader';
import { EmptyState } from '../components/EmptyState';
import { TablePagination } from '../components/TablePagination';
import { formatCurrency } from '../utils/format';
import { SearchIcon } from '../components/SearchIcon';

const api = getAccountingApi();
const today = new Date().toISOString().slice(0, 10);
const emptyForm: CreateTransactionInput = {
  date: today,
  description: '',
  account: '',
  type: 'Income',
  amount: 0,
  status: 'Completed',
};

type TypeFilter = 'all' | 'Income' | 'Expense';
type StatusFilter = 'all' | 'Completed' | 'Pending';

export function Transactions() {
  const { data: transactions, loading, reload } = useAsyncData(() => api.getTransactions());
  const { data: accounts } = useAsyncData(() => api.getAccounts());
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<CreateTransactionInput>(emptyForm);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  const isPayroll = (txn: Transaction) => txn.description.startsWith('Payroll -');

  const list = transactions ?? [];

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return list.filter((t) => {
      if (typeFilter !== 'all' && t.type !== typeFilter) return false;
      if (statusFilter !== 'all' && t.status !== statusFilter) return false;
      if (!q) return true;
      return (
        t.id.toLowerCase().includes(q)
        || t.description.toLowerCase().includes(q)
        || t.account.toLowerCase().includes(q)
      );
    });
  }, [list, search, typeFilter, statusFilter]);

  const {
    page, setPage, totalPages, paginated, from, to, total,
  } = usePagination(filtered, 12);

  const incomeTotal = list.filter((t) => t.type === 'Income').reduce((s, t) => s + Math.abs(t.amount), 0);
  const expenseTotal = list.filter((t) => t.type === 'Expense').reduce((s, t) => s + Math.abs(t.amount), 0);
  const pendingCount = list.filter((t) => t.status === 'Pending').length;

  const typeChips: Array<{ value: TypeFilter; label: string; count: number }> = [
    { value: 'all', label: 'All', count: list.length },
    { value: 'Income', label: 'Income', count: list.filter((t) => t.type === 'Income').length },
    { value: 'Expense', label: 'Expense', count: list.filter((t) => t.type === 'Expense').length },
  ];

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setShowForm(true);
  };

  const openEdit = (txn: Transaction) => {
    if (isPayroll(txn)) return;
    setEditingId(txn.id);
    setForm({
      date: txn.date,
      description: txn.description,
      account: txn.account,
      type: txn.type as 'Income' | 'Expense',
      amount: Math.abs(txn.amount),
      status: txn.status,
    });
    setShowForm(true);
  };

  const handleSubmit = async () => {
    if (!form.description || !form.account || form.amount <= 0) return;
    setSaving(true);
    try {
      if (editingId) {
        await api.updateTransaction(editingId, form);
      } else {
        await api.createTransaction(form);
      }
      setShowForm(false);
      setEditingId(null);
      setForm(emptyForm);
      reload();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await api.deleteTransaction(deleteId);
      setDeleteId(null);
      reload();
    } finally {
      setDeleting(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="hr-page container-fluid px-0">
      <header className="hr-page-header">
        <div className="hr-page-header-row">
          <SectionHeader
            size="page"
            title="Transactions"
            subtitle="View, filter, and manage all financial transactions"
          />
          <div className="hr-page-actions">
            <Button onClick={openCreate}>
              <Icons.Plus />
              New Transaction
            </Button>
          </div>
        </div>
      </header>

      <div className="row row-cols-1 row-cols-sm-2 row-cols-xl-4 g-3 mb-4">
        <MetricCard
          label="Total Transactions"
          value={String(list.length)}
          meta="All ledger entries"
          accent="transactions"
          icon={<Icons.Transactions />}
        />
        <MetricCard
          label="Income Recorded"
          value={formatCurrency(incomeTotal)}
          meta={`${list.filter((t) => t.type === 'Income').length} entries`}
          metaType="positive"
          accent="revenue"
          icon={<Icons.Dollar />}
          compactValue
        />
        <MetricCard
          label="Expenses Recorded"
          value={formatCurrency(expenseTotal)}
          meta={`${list.filter((t) => t.type === 'Expense').length} entries`}
          accent="expenses"
          icon={<Icons.Transactions />}
          compactValue
        />
        <MetricCard
          label="Pending"
          value={String(pendingCount)}
          meta="Awaiting completion"
          accent="pending"
          icon={<Icons.Transactions />}
        />
      </div>

      <div className="card hr-panel-card hr-directory-card shadow-sm">
        <div className="card-header py-3">
          <div className="row g-3 align-items-center">
            <div className="col-lg-4">
              <SectionHeader
                title="Transaction Ledger"
                subtitle="Search and filter by type or status"
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
                      placeholder="Search ID, description, or account..."
                      value={search}
                      onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                    />
                  </div>
                </div>
                <div className="col-md-5">
                  <Select
                    size="sm"
                    value={statusFilter}
                    onChange={(v) => { setStatusFilter(v as StatusFilter); setPage(1); }}
                    options={[
                      { value: 'all', label: 'All statuses' },
                      { value: 'Completed', label: 'Completed' },
                      { value: 'Pending', label: 'Pending' },
                    ]}
                  />
                </div>
              </div>
            </div>
          </div>
          <div className="hr-leave-status-chips mt-3">
            {typeChips.map((chip) => (
              <button
                key={chip.value}
                type="button"
                className={`hr-leave-chip${typeFilter === chip.value ? ' is-active' : ''}`}
                onClick={() => { setTypeFilter(chip.value); setPage(1); }}
              >
                {chip.label}
                <span className="hr-leave-chip-count">{chip.count}</span>
              </button>
            ))}
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="hr-empty-state-panel p-4">
            <EmptyState
              accent="transactions"
              title={list.length === 0 ? 'No transactions yet' : 'No matching transactions'}
              description={
                list.length === 0
                  ? 'Record income and expenses to build your financial ledger.'
                  : 'Try a different search term or filter.'
              }
              actionLabel={list.length === 0 ? 'New Transaction' : undefined}
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
                    <th>ID</th>
                    <th>Date</th>
                    <th>Description</th>
                    <th>Account</th>
                    <th>Type</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((row) => (
                    <tr key={row.id}>
                      <td><span className="hr-emp-id">{row.id}</span></td>
                      <td>{row.date}</td>
                      <td>
                        <span className="hr-emp-name">{row.description}</span>
                        {isPayroll(row) && (
                          <span style={{ marginLeft: 8 }}><Badge variant="info">Payroll</Badge></span>
                        )}
                      </td>
                      <td>{row.account}</td>
                      <td>
                        <Badge variant={row.type === 'Income' ? 'success' : 'danger'}>{row.type}</Badge>
                      </td>
                      <td>
                        <span className={row.amount > 0 ? 'acc-amount-positive' : 'acc-amount-negative'}>
                          {formatCurrency(row.amount)}
                        </span>
                      </td>
                      <td>
                        <Badge variant={row.status === 'Completed' ? 'success' : 'warning'}>{row.status}</Badge>
                      </td>
                      <td>
                        {!isPayroll(row) ? (
                          <div className="hr-table-actions flex-wrap">
                            <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => openEdit(row)}>Edit</button>
                            <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => setDeleteId(row.id)}>Delete</button>
                          </div>
                        ) : (
                          <span className="text-muted small">—</span>
                        )}
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
          title={editingId ? 'Edit Transaction' : 'New Transaction'}
          onClose={() => { setShowForm(false); setEditingId(null); }}
          onSubmit={handleSubmit}
          loading={saving}
          submitLabel={editingId ? 'Save Changes' : 'Create Transaction'}
        >
          <div style={formFieldStyle.grid}>
            <label style={formFieldStyle.field}>
              <span style={formFieldStyle.label}>Date</span>
              <input type="date" style={formFieldStyle.input} value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </label>
            <label style={formFieldStyle.field}>
              <span style={formFieldStyle.label}>Description</span>
              <input type="text" style={formFieldStyle.input} value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </label>
            <label style={formFieldStyle.field}>
              <span style={formFieldStyle.label}>Type</span>
              <Select
                value={form.type}
                onChange={(type) => setForm({ ...form, type: type as 'Income' | 'Expense' })}
                options={[
                  { value: 'Income', label: 'Income' },
                  { value: 'Expense', label: 'Expense' },
                ]}
              />
            </label>
            <label style={formFieldStyle.field}>
              <span style={formFieldStyle.label}>Account</span>
              <Select
                value={form.account}
                onChange={(account) => setForm({ ...form, account })}
                placeholder="Select account"
                options={[
                  { value: '', label: 'Select account' },
                  ...(accounts ?? []).map((a) => ({ value: a.name, label: a.name })),
                ]}
              />
            </label>
            <label style={formFieldStyle.field}>
              <span style={formFieldStyle.label}>Amount (USD)</span>
              <input type="number" min="0" step="0.01" style={formFieldStyle.input} value={form.amount || ''}
                onChange={(e) => setForm({ ...form, amount: parseFloat(e.target.value) || 0 })} />
            </label>
            <label style={formFieldStyle.field}>
              <span style={formFieldStyle.label}>Status</span>
              <Select
                value={form.status}
                onChange={(status) => setForm({ ...form, status: status ?? 'Completed' })}
                options={[
                  { value: 'Completed', label: 'Completed' },
                  { value: 'Pending', label: 'Pending' },
                ]}
              />
            </label>
          </div>
        </Modal>
      )}

      {deleteId && (
        <ConfirmDialog
          title="Delete transaction?"
          message="This will remove the transaction and reverse its effect on the account balance."
          confirmLabel="Delete"
          onConfirm={handleDelete}
          onCancel={() => setDeleteId(null)}
          loading={deleting}
        />
      )}
    </div>
  );
}
