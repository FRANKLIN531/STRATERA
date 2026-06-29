import { useState, useMemo } from 'react';
import {
  Button, Badge, LoadingSpinner, useAsyncData,
  Modal, formFieldStyle, Icons, ConfirmDialog, Select,
} from '@stratera/shared';
import type { CreateLeaveInput, LeaveBalance, LeaveRequest } from '@stratera/shared';
import { getHrApi } from '../api';
import { MetricCard } from '../components/MetricCard';
import { SectionHeader } from '../components/SectionHeader';
import { useHrNavState } from '../context/HrNavContext';
import '../styles/hr-dashboard.css';

const today = new Date().toISOString().slice(0, 10);
const LEAVE_TYPES = [
  'Annual Leave',
  'Sick Leave',
  'Maternity Leave',
  'Paternity Leave',
] as const;

const emptyForm: CreateLeaveInput = {
  employee: '',
  type: 'Annual Leave',
  startDate: today,
  endDate: today,
  days: 1,
  reason: '',
  medicalCertificateProvided: false,
};

function employeeInitials(name: string) {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function statusVariant(status: string): 'success' | 'warning' | 'danger' | 'info' {
  if (status === 'Approved') return 'success';
  if (status === 'Rejected') return 'danger';
  if (status === 'Cancelled') return 'info';
  return 'warning';
}

function formatDays(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  if (Number.isInteger(rounded)) return String(rounded);
  return rounded.toFixed(1);
}

/** Working days Mon–Fri between two dates (inclusive). */
function countWorkingDays(start: string, end: string): number {
  const s = new Date(`${start}T12:00:00`);
  const e = new Date(`${end}T12:00:00`);
  if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) return 1;
  const from = s <= e ? s : e;
  const to = s <= e ? e : s;
  let count = 0;
  const d = new Date(from);
  while (d <= to) {
    const day = d.getDay();
    if (day !== 0 && day !== 6) count += 1;
    d.setDate(d.getDate() + 1);
  }
  return Math.max(1, count);
}

function daysAvailableLabel(remaining: number, entitlement: number): string {
  if (entitlement <= 0) return 'Not applicable';
  if (remaining <= 0) return 'None left';
  const days = formatDays(remaining);
  return `${days} day${remaining === 1 ? '' : 's'} available`;
}

function leaveTypeOptionsForEmployee(gender?: string) {
  return LEAVE_TYPES.filter((type) => {
    if (type === 'Maternity Leave') return gender === 'Female';
    if (type === 'Paternity Leave') return gender === 'Male';
    return true;
  }).map((type) => ({ value: type, label: type }));
}

function EmployeeBalanceHint({ balance }: { balance: LeaveBalance | undefined }) {
  if (!balance) return null;
  return (
    <div className="hr-leave-balance-hint small text-secondary mb-3" role="status">
      <span className="hr-leave-balance-hint-label">Leave balance</span>
      <div className="hr-leave-balance-hint-body">
        <strong>{balance.employeeName}</strong> — Annual: {daysAvailableLabel(balance.annualRemaining, balance.annualEntitlement)}
        · Sick: {daysAvailableLabel(balance.sickRemaining, balance.sickEntitlement)}
        {balance.onProbation && (
          <span className="text-warning ms-1">(On probation — leave accrues but cannot be taken yet)</span>
        )}
      </div>
    </div>
  );
}

export function Leave() {
  const navState = useHrNavState();
  const { data: leaveRequests, loading, reload } = useAsyncData(() => getHrApi().getLeaveRequests());
  const { data: employees } = useAsyncData(() => getHrApi().getEmployees());
  const { data: balances, reload: reloadBalances } = useAsyncData(() => getHrApi().getLeaveBalances());
  const { data: settings } = useAsyncData(() => getHrApi().getSettings());
  const [showForm, setShowForm] = useState(false);
  const [showBalances, setShowBalances] = useState(true);
  const [showLeaveGuide, setShowLeaveGuide] = useState(false);
  const [actionSuccess, setActionSuccess] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [actionError, setActionError] = useState('');
  const [form, setForm] = useState<CreateLeaveInput>(emptyForm);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [cancelTarget, setCancelTarget] = useState<LeaveRequest | null>(null);
  const [cancelError, setCancelError] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<
    'all' | 'Pending' | 'Approved' | 'Rejected' | 'Cancelled'
  >(
    (navState.statusFilter as 'Pending' | 'Approved' | 'Rejected' | 'Cancelled') ?? 'all',
  );

  const activeEmployees = (employees ?? []).filter((e) => e.status === 'Active' || e.status === 'On Leave');
  const selectedEmployee = (employees ?? []).find((e) => e.name === form.employee);
  const selectedBalance = (balances ?? []).find((b) => b.employeeName === form.employee);
  const sickCertThreshold = parseInt(settings?.leaveSickMedicalCertDays ?? '2', 10) || 2;
  const needsMedicalCert =
    form.type.toLowerCase().includes('sick') && form.days > sickCertThreshold;

  const openCreate = () => {
    setEditingId(null);
    const firstEmployee = activeEmployees[0]?.name ?? '';
    setForm({
      ...emptyForm,
      employee: firstEmployee,
      days: countWorkingDays(today, today),
    });
    setFormError('');
    setShowForm(true);
  };

  const openEdit = (leave: LeaveRequest) => {
    setEditingId(leave.id);
    setForm({
      employee: leave.employee,
      type: leave.type,
      startDate: leave.startDate,
      endDate: leave.endDate,
      days: leave.days,
      reason: leave.reason,
      medicalCertificateProvided: leave.medicalCertificateProvided ?? false,
    });
    setFormError('');
    setShowForm(true);
  };

  const validateForm = (): string | null => {
    if (!form.employee.trim()) return 'Please select an employee.';
    if (!form.reason.trim()) return 'Please enter a reason for the leave.';
    if (form.days <= 0) return 'Number of days must be at least 1.';
    if (!form.startDate || !form.endDate) return 'Please choose start and end dates.';
    return null;
  };

  const openCancel = (row: LeaveRequest) => {
    setCancelError('');
    setCancelTarget(row);
  };

  const handleSubmit = async () => {
    const validationError = validateForm();
    if (validationError) {
      setFormError(validationError);
      return;
    }
    setSaving(true);
    setFormError('');
    const api = getHrApi();
    try {
      if (editingId) {
        await api.updateLeaveRequest(editingId, form);
      } else {
        await api.createLeaveRequest(form);
      }
      setShowForm(false);
      setEditingId(null);
      setForm(emptyForm);
      reload();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Could not save leave request.');
    } finally {
      setSaving(false);
    }
  };

  const updateDates = (startDate: string, endDate: string) => {
    setForm({
      ...form,
      startDate,
      endDate,
      days: countWorkingDays(startDate, endDate),
    });
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await getHrApi().deleteLeaveRequest(deleteId);
      setDeleteId(null);
      reload();
    } finally {
      setDeleting(false);
    }
  };

  const handleCancel = async () => {
    if (!cancelTarget) return;
    setCancelling(true);
    setCancelError('');
    try {
      const api = getHrApi();
      if (typeof api.cancelLeaveRequest !== 'function') {
        setCancelError('Cancel is not available. Fully close STRATERA and run start-stratera.bat again.');
        return;
      }
      const result = await api.cancelLeaveRequest(cancelTarget.id);
      if (!result) {
        setCancelError('Could not cancel this leave request.');
        return;
      }
      setCancelTarget(null);
      setActionSuccess(`${result.employee}'s leave was cancelled. Balances were updated.`);
      reload();
      reloadBalances();
      setTimeout(() => setActionSuccess(''), 5000);
    } catch (err) {
      setCancelError(err instanceof Error ? err.message : 'Could not cancel leave request.');
    } finally {
      setCancelling(false);
    }
  };

  const handleManagerApprove = async (id: string) => {
    setActionError('');
    await getHrApi().approveLeaveManager(id);
    reload();
  };

  const handleHrApprove = async (id: string) => {
    setActionError('');
    try {
      await getHrApi().approveLeaveHr(id);
      reload();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'HR approval failed.');
    }
  };

  const handleStatus = async (id: string, status: 'Approved' | 'Rejected') => {
    setActionError('');
    try {
      await getHrApi().updateLeaveStatus(id, status);
      reload();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not update leave status.');
    }
  };

  const list = leaveRequests ?? [];
  const pendingCount = list.filter((r) => r.status === 'Pending').length;
  const approvedCount = list.filter((r) => r.status === 'Approved').length;
  const rejectedCount = list.filter((r) => r.status === 'Rejected').length;
  const cancelledCount = list.filter((r) => r.status === 'Cancelled').length;
  const totalDays = list.reduce((sum, r) => sum + r.days, 0);

  const statusChips: Array<{ value: typeof statusFilter; label: string; count: number }> = [
    { value: 'all', label: 'All', count: list.length },
    { value: 'Pending', label: 'Pending', count: pendingCount },
    { value: 'Approved', label: 'Approved', count: approvedCount },
    { value: 'Rejected', label: 'Rejected', count: rejectedCount },
    { value: 'Cancelled', label: 'Cancelled', count: cancelledCount },
  ];

  const filteredList = useMemo(() => {
    const q = search.trim().toLowerCase();
    return list.filter((r) => {
      if (statusFilter !== 'all' && r.status !== statusFilter) return false;
      if (!q) return true;
      return (
        r.employee.toLowerCase().includes(q) ||
        r.type.toLowerCase().includes(q) ||
        r.reason.toLowerCase().includes(q) ||
        r.id.toLowerCase().includes(q) ||
        r.status.toLowerCase().includes(q)
      );
    });
  }, [list, search, statusFilter]);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="hr-page container-fluid px-0">
      <header className="hr-page-header">
        <div className="hr-page-header-row">
          <SectionHeader
            size="page"
            title="Leave"
            subtitle="Request time off and see how many days each person can still take"
          />
          <div className="hr-page-actions">
            <Button onClick={openCreate} disabled={activeEmployees.length === 0}>
              <Icons.Plus />
              New Request
            </Button>
          </div>
        </div>
      </header>

      <div className="row row-cols-1 row-cols-sm-2 row-cols-xl-4 g-3 mb-4">
        <MetricCard
          label="Pending"
          value={String(pendingCount)}
          meta="Waiting for approval"
          accent="pending"
          icon={<Icons.Leave />}
        />
        <MetricCard
          label="Approved"
          value={String(approvedCount)}
          meta="Confirmed time off"
          metaType="positive"
          accent="present"
          icon={<Icons.Leave />}
        />
        <MetricCard
          label="Rejected"
          value={String(rejectedCount)}
          meta="Not approved"
          accent="danger"
          icon={<Icons.Leave />}
        />
        <MetricCard
          label="Total days requested"
          value={String(totalDays)}
          meta={`${list.length} request${list.length === 1 ? '' : 's'} on record`}
          accent="leave"
          icon={<Icons.Attendance />}
        />
      </div>

      <div className="alert alert-light border shadow-sm mb-4 py-2 px-3" role="note">
        <button
          type="button"
          className="btn btn-link btn-sm text-secondary p-0 text-decoration-none"
          onClick={() => setShowLeaveGuide((v) => !v)}
        >
          {showLeaveGuide ? 'Hide' : 'How leave works in STRATERA'} ▾
        </button>
        {showLeaveGuide && (
          <ul className="small text-secondary mb-0 ps-3 mt-2">
            <li>Earned days minus used = what someone can still take.</li>
            <li>Mid-year joiners get <strong>pro-rated</strong> balances (e.g. 8.8 days is normal).</li>
            <li>Request → manager OK → HR approve → days deducted. Use <strong>Cancel leave</strong> to undo approved or pending requests.</li>
            <li>Sick leave over {sickCertThreshold} days needs a medical certificate before HR approval.</li>
          </ul>
        )}
      </div>

      {actionSuccess && (
        <div className="alert alert-success py-2 small mb-4" role="status">
          {actionSuccess}
        </div>
      )}

      {actionError && (
        <div className="alert alert-danger py-2 small mb-4" role="alert">
          {actionError}
        </div>
      )}

      <div className="card hr-panel-card hr-directory-card shadow-sm mb-4">
        <div className="card-header py-3 d-flex justify-content-between align-items-center">
          <SectionHeader
            title="Leave available per employee"
            subtitle="Working days still available to take this year"
          />
          <button
            type="button"
            className="btn btn-sm btn-outline-secondary"
            onClick={() => setShowBalances((v) => !v)}
          >
            {showBalances ? 'Hide' : 'Show'}
          </button>
        </div>
        {showBalances && (
        <div className="table-responsive">
          <table className="table table-sm table-hover align-middle mb-0 hr-directory-table">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Annual leave</th>
                <th>Sick leave</th>
                <th>Can take leave?</th>
              </tr>
            </thead>
            <tbody>
              {(balances ?? []).length === 0 ? (
                <tr>
                  <td colSpan={4} className="hr-directory-empty">No employees with leave balances yet.</td>
                </tr>
              ) : (
                (balances ?? []).map((b) => (
                  <tr key={b.employeeId}>
                    <td className="fw-medium">{b.employeeName}</td>
                    <td className="small">
                      <span className="fw-semibold text-dark">{daysAvailableLabel(b.annualRemaining, b.annualEntitlement)}</span>
                      {b.annualEntitlement > 0 && (
                        <div className="text-muted">Earned {formatDays(b.annualEntitlement)} · Used {formatDays(b.annualUsed)}</div>
                      )}
                    </td>
                    <td className="small">
                      <span className="fw-semibold text-dark">{daysAvailableLabel(b.sickRemaining, b.sickEntitlement)}</span>
                      {b.sickEntitlement > 0 && (
                        <div className="text-muted">Earned {formatDays(b.sickEntitlement)} · Used {formatDays(b.sickUsed)}</div>
                      )}
                    </td>
                    <td>
                      {b.onProbation ? (
                        <Badge variant="warning">On probation</Badge>
                      ) : (
                        <Badge variant="success">Yes</Badge>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        )}
      </div>

      <div className="card hr-panel-card hr-directory-card shadow-sm">
        <div className="card-header py-3">
          <div className="row g-3 align-items-center">
            <div className="col-lg-4">
              <SectionHeader
                title="Leave requests"
                subtitle="Review, approve, or cancel time off"
              />
            </div>
            <div className="col-lg-8">
              <div className="input-group input-group-sm hr-directory-search">
                <span className="input-group-text bg-white">
                  <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M11 18a7 7 0 100-14 7 7 0 000 14z" />
                  </svg>
                </span>
                <input
                  type="search"
                  className="form-control"
                  placeholder="Search employee, type, or reason..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
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
                onClick={() => setStatusFilter(chip.value)}
              >
                {chip.label}
                <span className="hr-leave-chip-count">{chip.count}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0 hr-directory-table">
            <thead>
              <tr>
                <th scope="col">Employee</th>
                <th scope="col">Type</th>
                <th scope="col">Dates</th>
                <th scope="col">Days</th>
                <th scope="col">Reason</th>
                <th scope="col">Status</th>
                <th scope="col" className="text-end">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan={7} className="hr-directory-empty">
                    {search.trim() || statusFilter !== 'all'
                      ? 'No leave requests match your filters.'
                      : 'No leave requests yet. Click New Request to add one.'}
                  </td>
                </tr>
              ) : (
                filteredList.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <div className="d-flex align-items-center gap-2">
                        <span className="hr-emp-avatar">{employeeInitials(row.employee)}</span>
                        <div>
                          <div className="hr-emp-name">{row.employee}</div>
                          <div className="hr-emp-id">{row.id}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="hr-dept-pill">{row.type}</span>
                      {row.medicalCertificateProvided && (
                        <div className="small text-success mt-1">Medical cert</div>
                      )}
                    </td>
                    <td className="text-secondary small">
                      <div>{formatDate(row.startDate)}</div>
                      <div className="text-muted">to {formatDate(row.endDate)}</div>
                    </td>
                    <td>
                      <span className="fw-semibold text-dark">{row.days}</span>
                    </td>
                    <td className="text-secondary small" style={{ maxWidth: 220 }}>
                      {row.reason}
                    </td>
                    <td>
                      <Badge variant={statusVariant(row.status)}>{row.status}</Badge>
                    </td>
                    <td>
                      {row.status === 'Pending' ? (
                        <div className="hr-table-actions flex-wrap">
                          <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => openEdit(row)}>Edit</button>
                          <button type="button" className="btn btn-sm btn-outline-warning" onClick={() => openCancel(row)}>Cancel</button>
                          <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => setDeleteId(row.id)}>Delete</button>
                          {!row.managerApproved && (
                            <button type="button" className="btn btn-sm btn-outline-primary" onClick={() => handleManagerApprove(row.id)}>
                              Manager OK
                            </button>
                          )}
                          {(row.managerApproved || row.approvalStage === 'Pending HR') && (
                            <button type="button" className="btn btn-sm btn-success" onClick={() => handleHrApprove(row.id)}>
                              HR Approve
                            </button>
                          )}
                          <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => handleStatus(row.id, 'Rejected')}>
                            Reject
                          </button>
                        </div>
                      ) : row.status === 'Approved' ? (
                        <div className="hr-table-actions flex-wrap">
                          <button type="button" className="btn btn-sm btn-warning text-dark" onClick={() => openCancel(row)}>
                            Cancel leave
                          </button>
                        </div>
                      ) : (
                        <span className="text-muted small">—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="card-footer hr-directory-footer py-2 px-3 d-flex justify-content-between align-items-center">
          <span>
            Showing <strong>{filteredList.length}</strong> of <strong>{list.length}</strong> requests
          </span>
          <span className="badge text-bg-light border text-muted">{pendingCount} pending</span>
        </div>
      </div>

      {showForm && (
        <Modal
          title={editingId ? 'Edit leave request' : 'New leave request'}
          onClose={() => { setShowForm(false); setEditingId(null); }}
          onSubmit={handleSubmit}
          loading={saving}
          submitLabel={editingId ? 'Save changes' : 'Submit request'}
          width={560}
        >
          {activeEmployees.length === 0 ? (
            <p className="small text-danger mb-0">No active employees. Add an employee first.</p>
          ) : (
            <>
              <label style={formFieldStyle.field}>
                <span style={formFieldStyle.label}>Employee (required)</span>
                <Select
                  value={form.employee}
                  onChange={(employee) => {
                    const emp = (employees ?? []).find((e) => e.name === employee);
                    const options = leaveTypeOptionsForEmployee(emp?.gender);
                    const type = options.some((o) => o.value === form.type) ? form.type : options[0]?.value ?? 'Annual Leave';
                    setForm({ ...form, employee, type });
                    setFormError('');
                  }}
                  placeholder="Select employee"
                  options={activeEmployees.map((e) => ({
                    value: e.name,
                    label: e.name,
                  }))}
                />
              </label>

              <EmployeeBalanceHint balance={selectedBalance} />

              <div style={formFieldStyle.grid}>
                <label style={formFieldStyle.field}>
                  <span style={formFieldStyle.label}>Leave type</span>
                  <Select
                    value={form.type}
                    onChange={(type) => setForm({ ...form, type })}
                    options={leaveTypeOptionsForEmployee(selectedEmployee?.gender)}
                  />
                </label>
                <label style={formFieldStyle.field}>
                  <span style={formFieldStyle.label}>Start date</span>
                  <input
                    type="date"
                    style={formFieldStyle.input}
                    value={form.startDate}
                    onChange={(e) => updateDates(e.target.value, form.endDate)}
                  />
                </label>
                <label style={formFieldStyle.field}>
                  <span style={formFieldStyle.label}>End date</span>
                  <input
                    type="date"
                    style={formFieldStyle.input}
                    value={form.endDate}
                    onChange={(e) => updateDates(form.startDate, e.target.value)}
                  />
                </label>
                <label style={formFieldStyle.field}>
                  <span style={formFieldStyle.label}>Working days</span>
                  <input
                    type="number"
                    min="1"
                    style={formFieldStyle.input}
                    value={form.days}
                    onChange={(e) => setForm({ ...form, days: parseInt(e.target.value, 10) || 1 })}
                  />
                  <span className="small text-muted">Counted Mon–Fri between your dates. You can adjust if needed.</span>
                </label>
                {needsMedicalCert && (
                  <label style={{ ...formFieldStyle.field, display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                    <input
                      type="checkbox"
                      checked={form.medicalCertificateProvided ?? false}
                      onChange={(e) => setForm({ ...form, medicalCertificateProvided: e.target.checked })}
                    />
                    <span>
                      <span style={formFieldStyle.label}>Medical certificate provided</span>
                      <span className="small text-muted d-block">
                        Needed before HR can approve sick leave over {sickCertThreshold} days.
                      </span>
                    </span>
                  </label>
                )}
                <label style={formFieldStyle.field}>
                  <span style={formFieldStyle.label}>Reason (required)</span>
                  <textarea
                    style={{ ...formFieldStyle.input, minHeight: 80, resize: 'vertical' }}
                    value={form.reason}
                    onChange={(e) => {
                      setForm({ ...form, reason: e.target.value });
                      if (formError) setFormError('');
                    }}
                    placeholder="e.g. Family travel, medical rest, personal matter"
                  />
                </label>
              </div>
            </>
          )}
          {formError && (
            <div className="alert alert-danger py-2 small mt-3 mb-0" role="alert">
              {formError}
            </div>
          )}
        </Modal>
      )}

      {deleteId && (
        <ConfirmDialog
          title="Delete leave request?"
          message="This pending leave request will be permanently removed."
          confirmLabel="Delete"
          onConfirm={handleDelete}
          onCancel={() => setDeleteId(null)}
          loading={deleting}
        />
      )}

      {cancelTarget && (
        <ConfirmDialog
          title="Cancel leave request?"
          message={
            cancelTarget.status === 'Approved'
              ? `${cancelTarget.employee}'s approved leave (${formatDate(cancelTarget.startDate)} – ${formatDate(cancelTarget.endDate)}, ${cancelTarget.days} day${cancelTarget.days === 1 ? '' : 's'}) will be cancelled. Leave days go back to their balance and on-leave attendance for those dates is removed.`
              : `${cancelTarget.employee}'s pending request will be marked cancelled (kept on record, not deleted).`
          }
          confirmLabel="Yes, cancel leave"
          cancelLabel="Go back"
          error={cancelError}
          onConfirm={handleCancel}
          onCancel={() => { setCancelTarget(null); setCancelError(''); }}
          loading={cancelling}
        />
      )}
    </div>
  );
}
