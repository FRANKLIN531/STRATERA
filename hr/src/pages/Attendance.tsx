import { useState, useMemo, useRef } from 'react';
import {
  Badge, Button, LoadingSpinner, useAsyncData, Icons, Modal, formFieldStyle, ConfirmDialog, readFileAsText, Select,
} from '@stratera/shared';
import type { CreateAttendanceInput, AttendanceRecord } from '@stratera/shared';
import { getHrApi } from '../api';
import { MetricCard } from '../components/MetricCard';
import { SectionHeader } from '../components/SectionHeader';
import { KioskCheckInPanel } from '../components/KioskCheckInPanel';
import { useHrNavState } from '../context/HrNavContext';
import '../styles/hr-dashboard.css';

const api = getHrApi();
const today = new Date().toISOString().slice(0, 10);
const emptyRecord: CreateAttendanceInput = {
  employee: '',
  date: today,
  checkIn: '09:00',
  checkOut: '17:00',
  hours: 8,
  status: 'Present',
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
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}

function statusVariant(status: string): 'success' | 'warning' | 'danger' {
  if (status === 'Present') return 'success';
  if (status === 'On Leave') return 'warning';
  return 'danger';
}

function formatHours(hours: number) {
  if (hours <= 0) return '—';
  return `${hours}h`;
}

function formatApiError(err: unknown, fallback: string): string {
  if (err instanceof Error) {
    return err.message.replace(/^Error invoking remote method '[^']+': Error: /, '') || fallback;
  }
  return fallback;
}

function isEmptyClockTime(value: string) {
  const s = value.trim();
  return !s || s === '—' || s === '-';
}

function localToday() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function todayDateKeys() {
  const local = localToday();
  const utc = new Date().toISOString().slice(0, 10);
  return local === utc ? [local] : [local, utc];
}

function todayRecordsForEmployee(records: AttendanceRecord[], employeeName: string) {
  const name = employeeName.trim().toLowerCase();
  const dates = new Set(todayDateKeys());
  return records.filter((r) => r.employee.trim().toLowerCase() === name && dates.has(r.date));
}

type ClockDayStatus = 'none' | 'in' | 'out';

function employeeClockStatus(records: AttendanceRecord[], employeeName: string): ClockDayStatus {
  const todayRows = todayRecordsForEmployee(records, employeeName);
  if (!todayRows.some((r) => !isEmptyClockTime(r.checkIn))) return 'none';
  if (todayRows.some((r) => !isEmptyClockTime(r.checkIn) && isEmptyClockTime(r.checkOut))) return 'in';
  return 'out';
}

function clockStatusLabel(status: ClockDayStatus) {
  if (status === 'in') return 'Clocked in';
  if (status === 'out') return 'Clocked out';
  return 'Not clocked in';
}

export function Attendance() {
  const navState = useHrNavState();
  const { data: attendance, loading, reload } = useAsyncData(() => api.getAttendance());
  const { data: employees } = useAsyncData(() => api.getEmployees());
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState(navState.dateFrom ?? '');
  const [dateTo, setDateTo] = useState(navState.dateTo ?? '');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<CreateAttendanceInput>(emptyRecord);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [clockEmployee, setClockEmployee] = useState('');
  const [clockSearch, setClockSearch] = useState('');
  const [clockMessage, setClockMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);
  const csvInputRef = useRef<HTMLInputElement>(null);

  const list = attendance ?? [];
  const activeEmployees = useMemo(
    () => (employees ?? []).filter((e) => e.status === 'Active'),
    [employees],
  );
  const filteredClockEmployees = useMemo(() => {
    const q = clockSearch.trim().toLowerCase();
    if (!q) return activeEmployees;
    return activeEmployees.filter(
      (e) => e.name.toLowerCase().includes(q) || e.department.toLowerCase().includes(q),
    );
  }, [activeEmployees, clockSearch]);
  const selectedClockEmployee = activeEmployees.find((e) => e.name === clockEmployee) ?? null;
  const selectedClockStatus = selectedClockEmployee
    ? employeeClockStatus(list, selectedClockEmployee.name)
    : null;
  const presentCount = list.filter((r) => r.status === 'Present').length;
  const onLeaveCount = list.filter((r) => r.status === 'On Leave').length;
  const totalHours = list.reduce((sum, r) => sum + r.hours, 0);
  const attendanceRate = list.length > 0
    ? `${((presentCount / list.length) * 100).toFixed(1)}%`
    : '0%';

  const filteredList = useMemo(() => {
    const q = search.trim().toLowerCase();
    return list.filter((r) => {
      if (dateFrom && r.date < dateFrom) return false;
      if (dateTo && r.date > dateTo) return false;
      if (!q) return true;
      return (
        r.employee.toLowerCase().includes(q) ||
        r.date.toLowerCase().includes(q) ||
        r.id.toLowerCase().includes(q) ||
        r.status.toLowerCase().includes(q) ||
        r.checkIn.toLowerCase().includes(q)
      );
    });
  }, [list, search, dateFrom, dateTo]);

  const openEdit = (row: AttendanceRecord) => {
    setEditingId(row.id);
    setForm({
      employee: row.employee,
      date: row.date,
      checkIn: row.checkIn,
      checkOut: row.checkOut,
      hours: row.hours,
      status: row.status,
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.employee || !form.date) return;
    setSaving(true);
    try {
      if (editingId) await api.updateAttendance(editingId, form);
      else await api.createAttendance(form);
      setShowForm(false);
      setEditingId(null);
      setForm(emptyRecord);
      reload();
    } finally {
      setSaving(false);
    }
  };

  const handleClockIn = async () => {
    if (!clockEmployee) {
      setClockMessage({ type: 'error', text: 'Select an employee before clocking in.' });
      return;
    }
    const todayRows = todayRecordsForEmployee(list, clockEmployee);
    if (todayRows.some((r) => !isEmptyClockTime(r.checkIn))) {
      setClockMessage({ type: 'error', text: `${clockEmployee} has already clocked in.` });
      return;
    }
    setClockMessage(null);
    try {
      await api.clockIn(clockEmployee);
      setClockMessage({ type: 'success', text: `${clockEmployee} clocked in successfully.` });
      reload();
    } catch (err) {
      setClockMessage({ type: 'error', text: formatApiError(err, 'Could not clock in.') });
    }
  };

  const handleClockOut = async () => {
    if (!clockEmployee) {
      setClockMessage({ type: 'error', text: 'Select an employee before clocking out.' });
      return;
    }
    const todayRows = todayRecordsForEmployee(list, clockEmployee);
    if (!todayRows.some((r) => !isEmptyClockTime(r.checkIn))) {
      setClockMessage({ type: 'error', text: `${clockEmployee} has not clocked in yet.` });
      return;
    }
    const openSession = todayRows.find((r) => !isEmptyClockTime(r.checkIn) && isEmptyClockTime(r.checkOut));
    if (!openSession) {
      setClockMessage({ type: 'error', text: `${clockEmployee} has already clocked out.` });
      return;
    }
    setClockMessage(null);
    try {
      await api.clockOut(clockEmployee);
      setClockMessage({ type: 'success', text: `${clockEmployee} clocked out successfully.` });
      reload();
    } catch (err) {
      setClockMessage({ type: 'error', text: formatApiError(err, 'Could not clock out.') });
    }
  };

  const handleCsvImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await readFileAsText(file);
    await api.importAttendanceCsv(text);
    reload();
    e.target.value = '';
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setSaving(true);
    try {
      await api.deleteAttendance(deleteId);
      setDeleteId(null);
      reload();
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="hr-page container-fluid px-0">
      <header className="hr-page-header">
        <div className="hr-page-header-row">
          <SectionHeader
            size="page"
            title="Attendance"
            subtitle="Track employee check-ins and working hours"
          />
          <div className="hr-page-actions d-flex flex-wrap gap-2 align-items-center">
            <Button onClick={() => csvInputRef.current?.click()}>Import CSV</Button>
            <input
              ref={csvInputRef}
              type="file"
              accept=".csv"
              className="d-none"
              onChange={handleCsvImport}
            />
            <Button onClick={() => { setEditingId(null); setForm(emptyRecord); setShowForm(true); }}>
              <Icons.Plus />
              Add Record
            </Button>
          </div>
        </div>
      </header>

      <div className="row row-cols-1 row-cols-sm-2 row-cols-xl-4 g-3 mb-4">
        <MetricCard
          label="Present"
          value={String(presentCount)}
          meta="Checked in today"
          metaType="positive"
          accent="present"
          icon={<Icons.Attendance />}
        />
        <MetricCard
          label="On Leave"
          value={String(onLeaveCount)}
          meta="Away from office"
          accent="leave"
          icon={<Icons.Leave />}
        />
        <MetricCard
          label="Total Hours"
          value={totalHours > 0 ? `${totalHours}h` : '—'}
          meta={`${list.length} records tracked`}
          accent="payroll"
          icon={<Icons.TrendUp />}
        />
        <MetricCard
          label="Attendance Rate"
          value={attendanceRate}
          meta="Present vs all records"
          metaType={presentCount >= list.length / 2 ? 'positive' : 'neutral'}
          accent="reports"
          icon={<Icons.Reports />}
        />
      </div>

      <KioskCheckInPanel />

      <div className="card hr-clock-panel shadow-sm mb-4">
        <div className="card-header py-3 bg-white border-bottom">
          <SectionHeader
            title="Clock In / Out"
            subtitle="Record daily check-in and check-out for employees"
          />
        </div>
        <div className="card-body py-3 px-3 px-md-4">
          <div className="hr-clock-toolbar">
            <div className="hr-clock-field">
              <span className="hr-clock-field-label">Employee</span>
              <div className="hr-clock-field-controls">
                <input
                  type="search"
                  className="form-control form-control-sm hr-clock-search"
                  placeholder="Search employees..."
                  value={clockSearch}
                  onChange={(e) => setClockSearch(e.target.value)}
                  aria-label="Search employees for clock in or out"
                />
                <div className="hr-clock-select-wrap">
                  <Select
                    size="sm"
                    className="hr-clock-select"
                    value={clockEmployee}
                    onChange={(next) => {
                      setClockEmployee(next);
                      setClockMessage(null);
                    }}
                    placeholder="Choose employee..."
                    aria-label="Select employee"
                    options={[
                      { value: '', label: 'Choose employee...' },
                      ...filteredClockEmployees.map((emp) => ({
                        value: emp.name,
                        label: `${emp.name} — ${emp.department}`,
                      })),
                    ]}
                  />
                </div>
              </div>
            </div>

            {selectedClockEmployee && selectedClockStatus && (
              <div className="hr-clock-selected">
                <span className="hr-emp-avatar hr-emp-avatar-sm">{employeeInitials(selectedClockEmployee.name)}</span>
                <div className="hr-clock-selected-body">
                  <span className="hr-emp-name">{selectedClockEmployee.name}</span>
                  <span className="hr-emp-id">{selectedClockEmployee.department}</span>
                </div>
                <span className={`hr-clock-status hr-clock-status--${selectedClockStatus}`}>
                  {clockStatusLabel(selectedClockStatus)}
                </span>
              </div>
            )}

            <div className="hr-clock-actions">
              <Button onClick={handleClockIn} disabled={!clockEmployee}>
                Clock In
              </Button>
              <Button onClick={handleClockOut} disabled={!clockEmployee}>
                Clock Out
              </Button>
            </div>
          </div>
        </div>
      </div>

      {clockMessage && (
        <div
          className={`alert ${clockMessage.type === 'error' ? 'alert-danger' : 'alert-success'} d-flex align-items-center justify-content-between shadow-sm mb-4 py-2 px-3`}
          role="alert"
        >
          <span className="small mb-0">{clockMessage.text}</span>
          <button
            type="button"
            className="btn-close btn-close-sm ms-3"
            aria-label="Dismiss"
            onClick={() => setClockMessage(null)}
          />
        </div>
      )}

      <div className="alert alert-light border shadow-sm mb-4 py-3 px-4" role="note">
        <div className="d-flex gap-3 align-items-start">
          <span className="hr-stat-icon mt-1">
            <Icons.Attendance />
          </span>
          <div className="small text-secondary lh-base">
            Daily attendance is logged from check-in and check-out times. Hours are calculated automatically
            and feed into leave reporting across STRATERA HR.
          </div>
        </div>
      </div>

      <div className="card hr-panel-card hr-directory-card shadow-sm">
        <div className="card-header py-3">
          <div className="row g-3 align-items-center">
            <div className="col-lg-5">
              <SectionHeader
                title="Attendance Log"
                subtitle="Review check-ins, hours worked, and daily status"
              />
            </div>
            <div className="col-lg-7">
              <div className="input-group input-group-sm hr-directory-search">
                <span className="input-group-text bg-white">
                  <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M11 18a7 7 0 100-14 7 7 0 000 14z" />
                  </svg>
                </span>
                <input
                  type="search"
                  className="form-control"
                  placeholder="Search by employee, date, record ID, or status..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0 hr-directory-table">
            <thead>
              <tr>
                <th scope="col">Employee</th>
                <th scope="col">Date</th>
                <th scope="col">Check In</th>
                <th scope="col">Check Out</th>
                <th scope="col">Hours</th>
                <th scope="col">Late</th>
                <th scope="col">OT</th>
                <th scope="col">Status</th>
                <th scope="col" className="text-end">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan={9} className="hr-directory-empty">
                    {search.trim() ? 'No attendance records match your search.' : 'No attendance records found.'}
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
                    <td className="text-secondary">{formatDate(row.date)}</td>
                    <td>
                      {isEmptyClockTime(row.checkIn) ? (
                        <span className="text-muted">—</span>
                      ) : (
                        <span className="hr-emp-id">{row.checkIn}</span>
                      )}
                    </td>
                    <td>
                      {isEmptyClockTime(row.checkOut) ? (
                        <span className="text-muted">—</span>
                      ) : (
                        <span className="hr-emp-id">{row.checkOut}</span>
                      )}
                    </td>
                    <td>
                      <span className={row.hours > 0 ? 'fw-semibold text-dark' : 'text-muted'}>
                        {formatHours(row.hours)}
                      </span>
                    </td>
                    <td className="small text-secondary">{row.lateMinutes ? `${row.lateMinutes}m` : '—'}</td>
                    <td className="small text-secondary">{row.overtimeHours ? `${row.overtimeHours}h` : '—'}</td>
                    <td>
                      <Badge variant={statusVariant(row.status)}>{row.status}</Badge>
                    </td>
                    <td className="text-end">
                      <div className="hr-table-actions">
                        <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => openEdit(row)}>
                          Edit
                        </button>
                        <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => setDeleteId(row.id)}>
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

        <div className="card-footer hr-directory-footer py-2 px-3 d-flex justify-content-between align-items-center">
          <span>
            Showing <strong>{filteredList.length}</strong> of <strong>{list.length}</strong> records
          </span>
          <span className="badge text-bg-light border text-muted">{presentCount} present</span>
        </div>
      </div>

      {showForm && (
        <Modal title={editingId ? 'Edit Attendance Record' : 'Add Attendance Record'} onClose={() => { setShowForm(false); setEditingId(null); }} onSubmit={handleSave}
          loading={saving} submitLabel="Save Record">
          <div style={formFieldStyle.grid}>
            <label style={formFieldStyle.field}>
              <span style={formFieldStyle.label}>Employee</span>
              <Select
                value={form.employee}
                onChange={(employee) => setForm({ ...form, employee })}
                placeholder="Select employee"
                options={[
                  { value: '', label: 'Select employee' },
                  ...(employees ?? []).map((e) => ({ value: e.name, label: e.name })),
                ]}
              />
            </label>
            <label style={formFieldStyle.field}>
              <span style={formFieldStyle.label}>Date</span>
              <input type="date" style={formFieldStyle.input} value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </label>
            <label style={formFieldStyle.field}>
              <span style={formFieldStyle.label}>Check In</span>
              <input type="time" style={formFieldStyle.input} value={form.checkIn}
                onChange={(e) => setForm({ ...form, checkIn: e.target.value })} />
            </label>
            <label style={formFieldStyle.field}>
              <span style={formFieldStyle.label}>Check Out</span>
              <input type="time" style={formFieldStyle.input} value={form.checkOut}
                onChange={(e) => setForm({ ...form, checkOut: e.target.value })} />
            </label>
            <label style={formFieldStyle.field}>
              <span style={formFieldStyle.label}>Hours</span>
              <input type="number" min="0" step="0.5" style={formFieldStyle.input} value={form.hours}
                onChange={(e) => setForm({ ...form, hours: parseFloat(e.target.value) || 0 })} />
            </label>
            <label style={formFieldStyle.field}>
              <span style={formFieldStyle.label}>Status</span>
              <Select
                value={form.status}
                onChange={(status) => setForm({ ...form, status })}
                options={[
                  { value: 'Present', label: 'Present' },
                  { value: 'On Leave', label: 'On Leave' },
                  { value: 'Absent', label: 'Absent' },
                ]}
              />
            </label>
          </div>
        </Modal>
      )}

      {deleteId && (
        <ConfirmDialog title="Delete attendance record?" message="This record will be permanently removed."
          confirmLabel="Delete" onConfirm={handleDelete} onCancel={() => setDeleteId(null)} loading={saving} />
      )}
    </div>
  );
}
