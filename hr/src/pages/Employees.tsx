import { useState, useMemo } from 'react';
import {
  Button, Badge, LoadingSpinner, useAsyncData, usePagination, useTableSort,
  Modal, formFieldStyle, Icons, ConfirmDialog, validateEmail, validatePhone, normalizeEmail, Select,
} from '@stratera/shared';
import type { CreateEmployeeInput, Employee } from '@stratera/shared';
import { getHrApi } from '../api';
import { useHrCurrency } from '../context/HrSettingsContext';
import { MetricCard } from '../components/MetricCard';
import { SectionHeader } from '../components/SectionHeader';
import { TablePagination } from '../components/TablePagination';
import { EmptyState } from '../components/EmptyState';
import { useHrNav } from '../context/HrNavContext';
import '../styles/hr-dashboard.css';

const api = getHrApi();
const today = new Date().toISOString().slice(0, 10);

type EmployeeFormState = Omit<CreateEmployeeInput, 'salary' | 'workHoursRatio'> & {
  salary: string;
  workHoursRatio: string;
};

const emptyForm: EmployeeFormState = {
  name: '',
  department: '',
  email: '',
  phone: '',
  joinDate: today,
  salary: '',
  gender: '',
  employmentType: 'full_time',
  workHoursRatio: '1',
  undergroundMining: false,
  probationEndDate: '',
};

function employeeInitials(name: string) {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function formatJoinDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function Employees() {
  const { formatCurrency, currency } = useHrCurrency();
  const { navigate } = useHrNav();
  const { data: employees, loading, reload } = useAsyncData(() => api.getEmployees());
  const { data: departments } = useAsyncData(() => api.getDepartments());
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<EmployeeFormState>(emptyForm);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [formError, setFormError] = useState('');

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setFormError('');
    setShowForm(true);
  };

  const openEdit = (emp: Employee) => {
    setEditingId(emp.id);
    setForm({
      name: emp.name,
      department: emp.department,
      email: emp.email,
      phone: emp.phone ?? '',
      joinDate: emp.joinDate,
      salary: emp.salary > 0 ? String(emp.salary) : '',
      gender: emp.gender ?? '',
      employmentType: emp.employmentType ?? 'full_time',
      workHoursRatio: String(emp.workHoursRatio ?? 1),
      undergroundMining: emp.undergroundMining ?? false,
      probationEndDate: emp.probationEndDate ?? '',
    });
    setShowForm(true);
  };

  const handleSubmit = async () => {
    setFormError('');
    const emailErr = validateEmail(form.email);
    if (emailErr) {
      setFormError(emailErr);
      return;
    }
    const phoneErr = validatePhone(form.phone);
    if (phoneErr) {
      setFormError(phoneErr);
      return;
    }
    if (!form.name || !form.department) {
      setFormError('Name and department are required.');
      return;
    }
    const salary = parseFloat(form.salary);
    if (!form.salary.trim() || Number.isNaN(salary) || salary < 0) {
      setFormError('Enter a valid monthly salary.');
      return;
    }
    const workHoursRatio = parseFloat(form.workHoursRatio);
    if (Number.isNaN(workHoursRatio) || workHoursRatio <= 0 || workHoursRatio > 1) {
      setFormError('Work hours ratio must be between 0 and 1 (e.g. 0.5 for half-time).');
      return;
    }
    const payload: CreateEmployeeInput = {
      name: form.name,
      department: form.department,
      email: normalizeEmail(form.email),
      phone: form.phone,
      joinDate: form.joinDate,
      salary,
      gender: form.gender || undefined,
      employmentType: form.employmentType || 'full_time',
      workHoursRatio,
      undergroundMining: form.undergroundMining,
      probationEndDate: form.probationEndDate || undefined,
    };
    setSaving(true);
    try {
      if (editingId) {
        await api.updateEmployee(editingId, payload);
      } else {
        await api.createEmployee(payload);
      }
      setShowForm(false);
      setEditingId(null);
      setForm(emptyForm);
      reload();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Could not save employee.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await api.deleteEmployee(deleteId);
      setDeleteId(null);
      reload();
    } finally {
      setDeleting(false);
    }
  };

  const list = employees ?? [];
  const activeCount = list.filter((e) => e.status === 'Active').length;
  const onLeaveCount = list.filter((e) => e.status === 'On Leave').length;
  const deptCount = departments?.length ?? 0;

  const filteredList = useMemo(() => {
    const q = search.trim().toLowerCase();
    return list.filter((e) => {
      if (deptFilter && e.department !== deptFilter) return false;
      if (statusFilter && e.status !== statusFilter) return false;
      if (!q) return true;
      return (
        e.name.toLowerCase().includes(q) ||
        e.email.toLowerCase().includes(q) ||
        e.department.toLowerCase().includes(q) ||
        e.id.toLowerCase().includes(q)
      );
    });
  }, [list, search, deptFilter, statusFilter]);

  const { sorted, toggleSort } = useTableSort(filteredList, 'name');
  const { paginated, page, setPage, totalPages, from, to, total } = usePagination(sorted, 10);

  if (loading) return <LoadingSpinner />;

  return (
    <div key={currency} className="hr-page container-fluid px-0">
      {list.length === 0 ? (
        <>
          <header className="hr-page-header">
            <div className="hr-page-header-row">
              <SectionHeader
                size="page"
                title="Employees"
                subtitle="Manage employee records and profiles"
              />
              <div className="hr-page-actions">
                <Button size="sm" onClick={openCreate}>
                  <Icons.Plus />
                  Add Employee
                </Button>
              </div>
            </div>
          </header>

          <div className="row row-cols-1 row-cols-sm-2 row-cols-xl-4 g-3 mb-4">
            <MetricCard
              label="Total Employees"
              value="0"
              meta="Start building your directory"
              accent="employees"
              icon={<Icons.Employees />}
            />
            <MetricCard
              label="Active"
              value="0"
              meta="Currently employed"
              accent="present"
              icon={<Icons.Employees />}
            />
            <MetricCard
              label="On Leave"
              value="0"
              meta="Away from office"
              accent="leave"
              icon={<Icons.Leave />}
            />
            <MetricCard
              label="Departments"
              value={String(deptCount)}
              meta={deptCount > 0 ? 'Ready for assignments' : 'Add departments first'}
              accent="departments"
              icon={<Icons.Departments />}
            />
          </div>

          <div className="card hr-panel-card hr-directory-card shadow-sm">
            <div className="card-header py-3 border-bottom">
              <SectionHeader
                title="Employee Directory"
                subtitle="Your team records will appear here"
              />
            </div>
            <div className="hr-empty-state-panel">
              <EmptyState
                icon={<Icons.Employees />}
                accent="employees"
                title="Build your team directory"
                description="Add employees with their department, contact details, and salary to manage HR in one place."
                tips={
                  deptCount === 0
                    ? [
                        'Create a department under Departments',
                        'Add your first employee with email and phone',
                        'Send messages and track attendance from there',
                      ]
                    : [
                        'Click Add Employee to create a new record',
                        'Assign each person to a department',
                        'Use Messages to email your team',
                      ]
                }
                actionLabel="Add Employee"
                actionIcon={<Icons.Plus />}
                onAction={openCreate}
              />
            </div>
          </div>
        </>
      ) : (
        <>
      <header className="hr-page-header">
        <div className="hr-page-header-row">
          <SectionHeader
            size="page"
            title="Employees"
            subtitle="Manage employee records and profiles"
          />
          <div className="hr-page-actions">
            <Button onClick={openCreate}>
              <Icons.Plus />
              Add Employee
            </Button>
          </div>
        </div>
      </header>

      <div className="row row-cols-1 row-cols-sm-2 row-cols-xl-4 g-3 mb-4">
        <MetricCard
          label="Total Employees"
          value={String(list.length)}
          meta="All records in directory"
          accent="employees"
          icon={<Icons.Employees />}
        />
        <MetricCard
          label="Active"
          value={String(activeCount)}
          meta="Currently employed"
          metaType="positive"
          accent="present"
          icon={<Icons.Employees />}
        />
        <MetricCard
          label="On Leave"
          value={String(onLeaveCount)}
          meta="Away from office"
          accent="leave"
          icon={<Icons.Leave />}
        />
        <MetricCard
          label="Departments"
          value={String(deptCount)}
          meta="Organization units"
          accent="departments"
          icon={<Icons.Departments />}
        />
      </div>

      <div className="card hr-panel-card hr-directory-card shadow-sm">
        <div className="card-header py-3">
          <div className="row g-3 align-items-center">
            <div className="col-lg-5">
              <SectionHeader
                title="Employee Directory"
                subtitle="Search, review, and update team records"
              />
            </div>
            <div className="col-lg-7">
              <div className="row g-2">
                <div className="col-md-5">
                  <div className="input-group input-group-sm hr-directory-search">
                    <span className="input-group-text bg-white">
                      <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M11 18a7 7 0 100-14 7 7 0 000 14z" />
                      </svg>
                    </span>
                    <input type="search" className="form-control" placeholder="Search employees..." value={search} onChange={(e) => setSearch(e.target.value)} />
                  </div>
                </div>
                <div className="col-md-3">
                  <Select
                    size="sm"
                    value={deptFilter}
                    onChange={setDeptFilter}
                    options={[
                      { value: '', label: 'All departments' },
                      ...(departments ?? []).map((d) => ({ value: d.name, label: d.name })),
                    ]}
                  />
                </div>
                <div className="col-md-4">
                  <Select
                    size="sm"
                    value={statusFilter}
                    onChange={setStatusFilter}
                    options={[
                      { value: '', label: 'All statuses' },
                      { value: 'Active', label: 'Active' },
                      { value: 'On Leave', label: 'On Leave' },
                      { value: 'Terminated', label: 'Terminated' },
                    ]}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0 hr-directory-table">
            <thead>
              <tr>
                <th scope="col" onClick={() => toggleSort('name')} style={{ cursor: 'pointer' }}>Employee</th>
                <th scope="col">Department</th>
                <th scope="col">Salary</th>
                <th scope="col">Email</th>
                <th scope="col">Phone</th>
                <th scope="col">Joined</th>
                <th scope="col">Status</th>
                <th scope="col" className="text-end">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={8} className="hr-directory-empty">No employees match your filters.</td>
                </tr>
              ) : (
                paginated.map((emp) => (
                  <tr key={emp.id}>
                    <td>
                      <div className="d-flex align-items-center gap-2">
                        <span className="hr-emp-avatar">{employeeInitials(emp.name)}</span>
                        <div>
                          <button type="button" className="hr-text-link text-start" onClick={() => navigate('employee-profile', { employeeId: emp.id })}>
                            {emp.name}
                          </button>
                          <div className="hr-emp-id">{emp.id}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="hr-dept-pill">{emp.department}</span>
                    </td>
                    <td className="fw-semibold text-dark">{formatCurrency(emp.salary)}</td>
                    <td className="hr-emp-email">{emp.email}</td>
                    <td className="text-secondary">{emp.phone}</td>
                    <td className="text-secondary">{formatJoinDate(emp.joinDate)}</td>
                    <td>
                      <Badge variant={emp.status === 'Active' ? 'success' : 'warning'}>{emp.status}</Badge>
                    </td>
                    <td>
                      <div className="hr-table-actions">
                        <button type="button" className="btn btn-sm btn-outline-primary" onClick={() => navigate('employee-profile', { employeeId: emp.id })}>
                          Profile
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-secondary"
                          onClick={() => openEdit(emp)}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-danger"
                          onClick={() => setDeleteId(emp.id)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <TablePagination page={page} totalPages={totalPages} from={from} to={to} total={total} onPageChange={setPage} />
      </div>
        </>
      )}

      {showForm && (
        <Modal
          title={editingId ? 'Edit Employee' : 'Add Employee'}
          onClose={() => { setShowForm(false); setEditingId(null); }}
          onSubmit={handleSubmit}
          loading={saving}
          submitLabel={editingId ? 'Save Changes' : 'Add Employee'}
        >
          <div style={formFieldStyle.grid}>
            <label style={formFieldStyle.field}>
              <span style={formFieldStyle.label}>Full Name</span>
              <input type="text" style={formFieldStyle.input} value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </label>
            <label style={formFieldStyle.field}>
              <span style={formFieldStyle.label}>Department</span>
              <Select
                value={form.department}
                onChange={(department) => setForm({ ...form, department })}
                placeholder="Select department"
                options={[
                  { value: '', label: 'Select department' },
                  ...(departments ?? []).map((d) => ({ value: d.name, label: d.name })),
                ]}
              />
            </label>
            <label style={formFieldStyle.field}>
              <span style={formFieldStyle.label}>Monthly Salary</span>
              <input
                type="number"
                min="0"
                step="100"
                style={formFieldStyle.input}
                value={form.salary}
                onChange={(e) => setForm({ ...form, salary: e.target.value })}
                placeholder="e.g. 5000"
              />
            </label>
            <label style={formFieldStyle.field}>
              <span style={formFieldStyle.label}>Email</span>
              <input type="email" style={formFieldStyle.input} value={form.email} required
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="name@company.com" />
            </label>
            <label style={formFieldStyle.field}>
              <span style={formFieldStyle.label}>Phone</span>
              <input type="tel" style={formFieldStyle.input} value={form.phone} required
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="(555) 123-4567" />
            </label>
            <label style={formFieldStyle.field}>
              <span style={formFieldStyle.label}>Join Date</span>
              <input type="date" style={formFieldStyle.input} value={form.joinDate}
                onChange={(e) => setForm({ ...form, joinDate: e.target.value })} />
            </label>
            <label style={formFieldStyle.field}>
              <span style={formFieldStyle.label}>Gender</span>
              <Select
                value={form.gender ?? ''}
                onChange={(gender) => setForm({ ...form, gender })}
                placeholder="Select gender"
                options={[
                  { value: '', label: 'Not specified' },
                  { value: 'Female', label: 'Female' },
                  { value: 'Male', label: 'Male' },
                ]}
              />
            </label>
            <label style={formFieldStyle.field}>
              <span style={formFieldStyle.label}>Employment Type</span>
              <Select
                value={form.employmentType ?? 'full_time'}
                onChange={(employmentType) => setForm({ ...form, employmentType })}
                options={[
                  { value: 'full_time', label: 'Full-time' },
                  { value: 'part_time', label: 'Part-time' },
                  { value: 'contract', label: 'Contract' },
                ]}
              />
            </label>
            {(form.employmentType === 'part_time' || form.employmentType === 'contract') && (
              <label style={formFieldStyle.field}>
                <span style={formFieldStyle.label}>Work Hours Ratio</span>
                <input
                  type="number"
                  min="0.1"
                  max="1"
                  step="0.1"
                  style={formFieldStyle.input}
                  value={form.workHoursRatio}
                  onChange={(e) => setForm({ ...form, workHoursRatio: e.target.value })}
                  placeholder="e.g. 0.5 for half-time"
                />
              </label>
            )}
            <label style={formFieldStyle.field}>
              <span style={formFieldStyle.label}>Probation End Date</span>
              <input
                type="date"
                style={formFieldStyle.input}
                value={form.probationEndDate ?? ''}
                onChange={(e) => setForm({ ...form, probationEndDate: e.target.value })}
              />
              <span className="small text-muted">Leave accrues during probation but cannot be taken until this date passes.</span>
            </label>
            <label style={{ ...formFieldStyle.field, display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                type="checkbox"
                checked={form.undergroundMining ?? false}
                onChange={(e) => setForm({ ...form, undergroundMining: e.target.checked })}
              />
              <span style={formFieldStyle.label}>Underground mining staff (21-day annual entitlement)</span>
            </label>
          </div>
          {formError && <p className="small text-danger mt-2 mb-0">{formError}</p>}
        </Modal>
      )}

      {deleteId && (
        <ConfirmDialog
          title="Delete employee?"
          message="This employee record will be permanently removed."
          confirmLabel="Delete"
          onConfirm={handleDelete}
          onCancel={() => setDeleteId(null)}
          loading={deleting}
        />
      )}
    </div>
  );
}
