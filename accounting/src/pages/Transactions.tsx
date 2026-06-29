import { useState } from 'react';
import {
  PageHeader, DataTable, Button, Badge, LoadingSpinner, useAsyncData,
  Modal, formFieldStyle, strateraTheme, Icons, ConfirmDialog, Select,
  actionLinkStyle, actionColors,
} from '@stratera/shared';
import type { CreateTransactionInput, Transaction } from '@stratera/shared';
import { getAccountingApi } from '../api';

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

export function Transactions() {
  const { data: transactions, loading, reload } = useAsyncData(() => api.getTransactions());
  const { data: accounts } = useAsyncData(() => api.getAccounts());
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<CreateTransactionInput>(emptyForm);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const isPayroll = (txn: Transaction) => txn.description.startsWith('Payroll -');

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
    <div>
      <PageHeader
        title="Transactions"
        subtitle="View and manage all financial transactions"
        action={
          <Button onClick={openCreate}>
            <Icons.Plus />
            New Transaction
          </Button>
        }
      />

      <DataTable
        columns={[
          { key: 'id', header: 'Transaction ID', width: '130px' },
          { key: 'date', header: 'Date', width: '110px' },
          { key: 'description', header: 'Description', render: (row) => (
            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {row.description}
              {isPayroll(row) && <Badge variant="info">Payroll</Badge>}
            </span>
          )},
          { key: 'account', header: 'Account', width: '160px' },
          { key: 'type', header: 'Type', width: '100px', render: (row) => (
            <Badge variant={row.type === 'Income' ? 'success' : 'danger'}>{row.type}</Badge>
          )},
          { key: 'amount', header: 'Amount', width: '130px', render: (row) => (
            <span style={{ fontWeight: 600, color: row.amount > 0 ? strateraTheme.colors.success : strateraTheme.colors.danger }}>
              {row.amount.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
            </span>
          )},
          { key: 'status', header: 'Status', width: '110px', render: (row) => (
            <Badge variant={row.status === 'Completed' ? 'success' : 'warning'}>{row.status}</Badge>
          )},
          { key: 'actions', header: '', width: '100px', render: (row: Transaction) =>
            !isPayroll(row) ? (
              <div style={{ display: 'flex', gap: 10 }}>
                <button type="button" style={{ ...actionLinkStyle, color: actionColors.edit }} onClick={() => openEdit(row)}>Edit</button>
                <button type="button" style={{ ...actionLinkStyle, color: actionColors.delete }} onClick={() => setDeleteId(row.id)}>Delete</button>
              </div>
            ) : null,
          },
        ]}
        data={transactions ?? []}
      />

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
                onChange={(status) => setForm({ ...form, status })}
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
