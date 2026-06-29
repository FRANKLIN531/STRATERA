import { useState } from 'react';
import {
  PageHeader, DataTable, Button, Badge, LoadingSpinner, useAsyncData,
  Modal, formFieldStyle, Icons, exportInvoicePdf, strateraTheme,
  ConfirmDialog, actionLinkStyle, actionColors, Select,
} from '@stratera/shared';
import type { CreateInvoiceInput, Invoice } from '@stratera/shared';
import { getAccountingApi } from '../api';

const api = getAccountingApi();
const today = new Date().toISOString().slice(0, 10);
const defaultDue = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
const emptyForm: CreateInvoiceInput = {
  client: '',
  date: today,
  dueDate: defaultDue,
  amount: 0,
  status: 'Draft',
};

const statusVariant = (status: string) => {
  switch (status) {
    case 'Paid': return 'success';
    case 'Overdue': return 'danger';
    case 'Sent': return 'info';
    default: return 'default';
  }
};

export function Invoices() {
  const { data: invoices, loading, reload } = useAsyncData(() => api.getInvoices());
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<CreateInvoiceInput>(emptyForm);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setShowForm(true);
  };

  const openEdit = (inv: Invoice) => {
    setEditingId(inv.id);
    setForm({
      client: inv.client,
      date: inv.date,
      dueDate: inv.dueDate,
      amount: inv.amount,
      status: inv.status,
    });
    setShowForm(true);
  };

  const handleSubmit = async () => {
    if (!form.client || form.amount <= 0) return;
    setSaving(true);
    try {
      if (editingId) {
        await api.updateInvoice(editingId, form);
      } else {
        await api.createInvoice(form);
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
      await api.deleteInvoice(deleteId);
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
        title="Invoices"
        subtitle="Create, send, and track client invoices"
        action={
          <Button onClick={openCreate}>
            <Icons.Plus />
            Create Invoice
          </Button>
        }
      />

      <DataTable
        columns={[
          { key: 'id', header: 'Invoice #', width: '140px' },
          { key: 'client', header: 'Client' },
          { key: 'date', header: 'Issue Date', width: '120px' },
          { key: 'dueDate', header: 'Due Date', width: '120px' },
          { key: 'amount', header: 'Amount', width: '130px', render: (row) => (
            <span style={{ fontWeight: 600 }}>
              {row.amount.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
            </span>
          )},
          { key: 'status', header: 'Status', width: '110px', render: (row) => (
            <Badge variant={statusVariant(row.status)}>{row.status}</Badge>
          )},
          { key: 'actions', header: 'Actions', width: '200px', render: (row: Invoice) => (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button type="button" style={{ ...actionLinkStyle, color: actionColors.edit }} onClick={() => openEdit(row)}>Edit</button>
              <button type="button" style={{ ...actionLinkStyle, color: actionColors.delete }} onClick={() => setDeleteId(row.id)}>Delete</button>
              <button type="button" style={{ ...actionLinkStyle, color: actionColors.email }} onClick={() => api.emailInvoice(row)}>Email</button>
              <button
                type="button"
                onClick={() => exportInvoicePdf(row)}
                style={{
                  fontSize: 12,
                  padding: '4px 10px',
                  borderRadius: 6,
                  border: `1px solid ${strateraTheme.colors.gray300}`,
                  background: 'transparent',
                  color: strateraTheme.colors.navy,
                  fontWeight: 600,
                }}
              >
                PDF
              </button>
            </div>
          )},
        ]}
        data={invoices ?? []}
      />

      {showForm && (
        <Modal
          title={editingId ? 'Edit Invoice' : 'Create Invoice'}
          onClose={() => { setShowForm(false); setEditingId(null); }}
          onSubmit={handleSubmit}
          loading={saving}
          submitLabel={editingId ? 'Save Changes' : 'Create Invoice'}
        >
          <div style={formFieldStyle.grid}>
            <label style={formFieldStyle.field}>
              <span style={formFieldStyle.label}>Client Name</span>
              <input type="text" style={formFieldStyle.input} value={form.client}
                onChange={(e) => setForm({ ...form, client: e.target.value })} />
            </label>
            <label style={formFieldStyle.field}>
              <span style={formFieldStyle.label}>Issue Date</span>
              <input type="date" style={formFieldStyle.input} value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </label>
            <label style={formFieldStyle.field}>
              <span style={formFieldStyle.label}>Due Date</span>
              <input type="date" style={formFieldStyle.input} value={form.dueDate}
                onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
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
                  { value: 'Draft', label: 'Draft' },
                  { value: 'Sent', label: 'Sent' },
                  { value: 'Paid', label: 'Paid' },
                  { value: 'Overdue', label: 'Overdue' },
                ]}
              />
            </label>
          </div>
        </Modal>
      )}

      {deleteId && (
        <ConfirmDialog
          title="Delete invoice?"
          message="This invoice will be permanently removed."
          confirmLabel="Delete"
          onConfirm={handleDelete}
          onCancel={() => setDeleteId(null)}
          loading={deleting}
        />
      )}
    </div>
  );
}
