import { useMemo, useState } from 'react';
import {
  Button, Badge, LoadingSpinner, useAsyncData, usePagination,
  Modal, formFieldStyle, Icons, exportInvoicePdf,
  ConfirmDialog, Select,
} from '@stratera/shared';
import type { CreateInvoiceInput, Invoice } from '@stratera/shared';
import { getAccountingApi } from '../api';
import { MetricCard } from '../components/MetricCard';
import { SectionHeader } from '../components/SectionHeader';
import { EmptyState } from '../components/EmptyState';
import { TablePagination } from '../components/TablePagination';
import { formatCurrency } from '../utils/format';
import { SearchIcon } from '../components/SearchIcon';

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

type StatusFilter = 'all' | 'Draft' | 'Sent' | 'Paid' | 'Overdue';

export function Invoices() {
  const { data: invoices, loading, reload } = useAsyncData(() => api.getInvoices());
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<CreateInvoiceInput>(emptyForm);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  const list = invoices ?? [];

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return list.filter((inv) => {
      if (statusFilter !== 'all' && inv.status !== statusFilter) return false;
      if (!q) return true;
      return inv.id.toLowerCase().includes(q) || inv.client.toLowerCase().includes(q);
    });
  }, [list, search, statusFilter]);

  const {
    page, setPage, totalPages, paginated, from, to, total,
  } = usePagination(filtered, 10);

  const paidTotal = list.filter((i) => i.status === 'Paid').reduce((s, i) => s + i.amount, 0);
  const outstanding = list.filter((i) => i.status !== 'Paid').reduce((s, i) => s + i.amount, 0);

  const statusChips: Array<{ value: StatusFilter; label: string; count: number }> = [
    { value: 'all', label: 'All', count: list.length },
    { value: 'Draft', label: 'Draft', count: list.filter((i) => i.status === 'Draft').length },
    { value: 'Sent', label: 'Sent', count: list.filter((i) => i.status === 'Sent').length },
    { value: 'Paid', label: 'Paid', count: list.filter((i) => i.status === 'Paid').length },
    { value: 'Overdue', label: 'Overdue', count: list.filter((i) => i.status === 'Overdue').length },
  ];

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
    <div className="hr-page container-fluid px-0">
      <header className="hr-page-header">
        <div className="hr-page-header-row">
          <SectionHeader
            size="page"
            title="Invoices"
            subtitle="Create, send, and track client invoices"
          />
          <div className="hr-page-actions">
            <Button onClick={openCreate}>
              <Icons.Plus />
              Create Invoice
            </Button>
          </div>
        </div>
      </header>

      <div className="row row-cols-1 row-cols-sm-2 row-cols-xl-4 g-3 mb-4">
        <MetricCard
          label="Total Invoices"
          value={String(list.length)}
          meta="All client invoices"
          accent="invoices"
          icon={<Icons.Invoices />}
        />
        <MetricCard
          label="Collected"
          value={formatCurrency(paidTotal)}
          meta={`${list.filter((i) => i.status === 'Paid').length} paid`}
          metaType="positive"
          accent="revenue"
          icon={<Icons.Dollar />}
          compactValue
        />
        <MetricCard
          label="Outstanding"
          value={formatCurrency(outstanding)}
          meta="Unpaid or overdue"
          accent="pending"
          icon={<Icons.Invoices />}
          compactValue
        />
        <MetricCard
          label="Overdue"
          value={String(list.filter((i) => i.status === 'Overdue').length)}
          meta="Needs follow-up"
          accent="expenses"
          icon={<Icons.Invoices />}
        />
      </div>

      <div className="card hr-panel-card hr-directory-card shadow-sm">
        <div className="card-header py-3">
          <div className="row g-3 align-items-center">
            <div className="col-lg-4">
              <SectionHeader
                title="Invoice Register"
                subtitle="Filter by status or search clients"
              />
            </div>
            <div className="col-lg-8">
              <div className="input-group input-group-sm hr-directory-search">
                <span className="input-group-text bg-white"><SearchIcon /></span>
                <input
                  type="search"
                  className="form-control"
                  placeholder="Search invoice # or client..."
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                />
              </div>
            </div>
          </div>
          <div className="hr-leave-status-chips mt-3">
            {statusChips.map((chip) => (
              <button
                key={chip.value}
                type="button"
                className={`hr-leave-chip${statusFilter === chip.value ? ' is-active' : ''}`}
                onClick={() => { setStatusFilter(chip.value); setPage(1); }}
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
              accent="invoices"
              title={list.length === 0 ? 'No invoices yet' : 'No matching invoices'}
              description={
                list.length === 0
                  ? 'Create your first invoice to bill clients and track payments.'
                  : 'Try a different search or status filter.'
              }
              actionLabel={list.length === 0 ? 'Create Invoice' : undefined}
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
                    <th>Invoice #</th>
                    <th>Client</th>
                    <th>Issue Date</th>
                    <th>Due Date</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((row) => (
                    <tr key={row.id}>
                      <td><span className="hr-emp-id">{row.id}</span></td>
                      <td><span className="hr-emp-name">{row.client}</span></td>
                      <td>{row.date}</td>
                      <td>{row.dueDate}</td>
                      <td><span className="acc-amount-neutral">{formatCurrency(row.amount)}</span></td>
                      <td><Badge variant={statusVariant(row.status)}>{row.status}</Badge></td>
                      <td>
                        <div className="hr-table-actions flex-wrap">
                          <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => openEdit(row)}>Edit</button>
                          <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => setDeleteId(row.id)}>Delete</button>
                          <button type="button" className="btn btn-sm btn-outline-primary" onClick={() => api.emailInvoice(row)}>Email</button>
                          <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => exportInvoicePdf(row)}>PDF</button>
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
                onChange={(status) => setForm({ ...form, status: status ?? 'Draft' })}
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
