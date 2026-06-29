import { useState, useMemo } from 'react';
import {
  LoadingSpinner, useAsyncData, Modal, formFieldStyle, Icons, Badge, Select,
} from '@stratera/shared';
import { getHrApi } from '../api';
import { useHrSettings } from '../context/HrSettingsContext';
import { MetricCard } from '../components/MetricCard';
import { SectionHeader } from '../components/SectionHeader';
import { ConfidentialPasswordModal } from '../components/ConfidentialPasswordModal';
import '../styles/hr-dashboard.css';

const api = getHrApi();

const salaryPeriodLabel: Record<string, string> = {
  monthly: 'Monthly',
  biweekly: 'Bi-weekly',
  weekly: 'Weekly',
};

function employeeInitials(name: string) {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export function Salaries() {
  const { formatCurrency, currency, settings } = useHrSettings();
  const { data: employees, loading, reload } = useAsyncData(() => api.getEmployees());
  const { data: departments } = useAsyncData(() => api.getDepartments());
  const [search, setSearch] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [editId, setEditId] = useState<string | null>(null);
  const [baseSalary, setBaseSalary] = useState(0);
  const [saving, setSaving] = useState(false);
  const [salaryEditAuthOpen, setSalaryEditAuthOpen] = useState(false);
  const [pendingEditEmployee, setPendingEditEmployee] = useState<(typeof activeEmployees)[0] | null>(null);

  const activeEmployees = useMemo(
    () => (employees ?? []).filter((e) => e.status !== 'Terminated'),
    [employees],
  );

  const totalMonthly = activeEmployees.reduce((s, e) => s + e.salary, 0);
  const avgSalary = activeEmployees.length > 0 ? totalMonthly / activeEmployees.length : 0;
  const unsetCount = activeEmployees.filter((e) => e.salary <= 0).length;
  const period = salaryPeriodLabel[settings?.payrollCycle ?? 'monthly'] ?? 'Monthly';

  const departmentTotals = useMemo(() => {
    const map = new Map<string, { count: number; total: number }>();
    for (const emp of activeEmployees) {
      const row = map.get(emp.department) ?? { count: 0, total: 0 };
      row.count += 1;
      row.total += emp.salary;
      map.set(emp.department, row);
    }
    return [...map.entries()]
      .map(([name, stats]) => ({ name, ...stats }))
      .sort((a, b) => b.total - a.total);
  }, [activeEmployees]);

  const filteredList = useMemo(() => {
    const q = search.trim().toLowerCase();
    return activeEmployees.filter((e) => {
      if (departmentFilter && e.department !== departmentFilter) return false;
      if (!q) return true;
      return (
        e.name.toLowerCase().includes(q) ||
        e.department.toLowerCase().includes(q) ||
        e.role.toLowerCase().includes(q) ||
        e.id.toLowerCase().includes(q)
      );
    });
  }, [activeEmployees, search, departmentFilter]);

  const openEdit = (emp: (typeof activeEmployees)[0]) => {
    setEditId(emp.id);
    setBaseSalary(emp.salary);
  };

  const requestEditSalary = (emp: (typeof activeEmployees)[0]) => {
    setPendingEditEmployee(emp);
    setSalaryEditAuthOpen(true);
  };

  const handleSave = async () => {
    if (!editId) return;
    setSaving(true);
    try {
      await api.updateEmployeeSalary({ employeeId: editId, baseSalary });
      setEditId(null);
      reload();
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  const deptOptions = [
    { value: '', label: 'All departments' },
    ...(departments ?? []).map((d) => ({ value: d.name, label: d.name })),
  ];

  return (
    <div key={currency} className="hr-page container-fluid px-0">
      <header className="hr-page-header">
        <div className="hr-page-header-row">
          <SectionHeader
            size="page"
            title="Salaries"
            subtitle="Manage employee compensation — base salaries are stored here for HR records"
          />
        </div>
      </header>

      <div className="row row-cols-1 row-cols-sm-2 row-cols-xl-4 g-3 mb-4">
        <MetricCard
          label="Total Compensation"
          value={formatCurrency(totalMonthly)}
          meta={`${period} base · ${activeEmployees.length} employees`}
          accent="salaries"
          compactValue
          icon={<Icons.Dollar />}
        />
        <MetricCard
          label="Average Salary"
          value={formatCurrency(avgSalary)}
          meta={`Per active employee · ${period.toLowerCase()}`}
          accent="employees"
          compactValue
          icon={<Icons.TrendUp />}
        />
        <MetricCard
          label="Departments"
          value={String(departmentTotals.length)}
          meta="With active employees"
          accent="departments"
          compactValue
          icon={<Icons.Departments />}
        />
        <MetricCard
          label="Needs Setup"
          value={String(unsetCount)}
          meta={unsetCount === 0 ? 'All salaries configured' : 'Employees without a salary'}
          metaType={unsetCount === 0 ? 'positive' : 'neutral'}
          accent="pending"
          compactValue
          icon={<Icons.Employees />}
        />
      </div>

      {departmentTotals.length > 0 && (
        <div className="row row-cols-1 row-cols-md-2 row-cols-xl-3 g-3 mb-4">
          {departmentTotals.slice(0, 6).map((dept) => (
            <div key={dept.name} className="col">
              <div className="card hr-panel-card shadow-sm h-100">
                <div className="card-body py-3">
                  <div className="d-flex justify-content-between align-items-start gap-2">
                    <div>
                      <div className="small text-secondary fw-semibold text-uppercase">{dept.name}</div>
                      <div className="fw-bold text-dark mt-1">{formatCurrency(dept.total)}</div>
                      <div className="small text-muted">{dept.count} employee{dept.count === 1 ? '' : 's'}</div>
                    </div>
                    <span className="hr-dept-pill">{period}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="card hr-panel-card hr-directory-card shadow-sm">
        <div className="card-header py-3">
          <div className="row g-3 align-items-center">
            <div className="col-lg-4">
              <SectionHeader
                title="Compensation Records"
                subtitle="Base salary by employee — payment processing will be handled separately"
              />
            </div>
            <div className="col-lg-8">
              <div className="row g-2">
                <div className="col-md-5">
                  <Select
                    value={departmentFilter}
                    onChange={setDepartmentFilter}
                    options={deptOptions}
                  />
                </div>
                <div className="col-md-7">
                  <div className="input-group input-group-sm hr-directory-search">
                    <span className="input-group-text bg-white">
                      <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M11 18a7 7 0 100-14 7 7 0 000 14z" />
                      </svg>
                    </span>
                    <input
                      type="search"
                      className="form-control"
                      placeholder="Search by name, role, or ID..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0 hr-directory-table">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Department</th>
                <th>Role</th>
                <th>Base Salary</th>
                <th>Status</th>
                <th className="text-end">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center text-muted py-4 small">
                    No employees match your filters.
                  </td>
                </tr>
              ) : (
                filteredList.map((emp) => (
                  <tr key={emp.id}>
                    <td>
                      <div className="d-flex align-items-center gap-2">
                        <span className="hr-emp-avatar">{employeeInitials(emp.name)}</span>
                        <div>
                          <div className="hr-emp-name">{emp.name}</div>
                          <div className="hr-emp-id">{emp.id}</div>
                        </div>
                      </div>
                    </td>
                    <td><span className="hr-dept-pill">{emp.department}</span></td>
                    <td className="text-secondary">{emp.role}</td>
                    <td className="fw-semibold text-dark">
                      {emp.salary > 0 ? formatCurrency(emp.salary) : <span className="text-warning">Not set</span>}
                      <div className="text-muted small">{period}</div>
                    </td>
                    <td>
                      <Badge variant={emp.status === 'Active' ? 'success' : emp.status === 'On Leave' ? 'warning' : 'default'}>
                        {emp.status}
                      </Badge>
                    </td>
                    <td className="text-end">
                      <div className="hr-table-actions">
                        <button type="button" className="btn btn-sm btn-outline-primary" onClick={() => requestEditSalary(emp)}>
                          Edit Salary
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {salaryEditAuthOpen && pendingEditEmployee && (
        <ConfidentialPasswordModal
          title="Confirm salary change"
          description="Enter your password to edit this employee's base salary."
          submitLabel="Unlock edit"
          onClose={() => {
            setSalaryEditAuthOpen(false);
            setPendingEditEmployee(null);
          }}
          onVerified={() => {
            openEdit(pendingEditEmployee);
            setSalaryEditAuthOpen(false);
            setPendingEditEmployee(null);
          }}
        />
      )}

      {editId && (
        <Modal title="Update Base Salary" onClose={() => setEditId(null)} onSubmit={handleSave} loading={saving} submitLabel="Save Salary">
          <p className="small text-secondary mb-3">
            This updates the employee&apos;s recorded base salary in HR. Actual payment will be handled by the payroll module when it is added.
          </p>
          <label style={formFieldStyle.field}>
            <span style={formFieldStyle.label}>Base salary ({period.toLowerCase()})</span>
            <input
              type="number"
              min="0"
              step="100"
              style={formFieldStyle.input}
              value={baseSalary}
              onChange={(e) => setBaseSalary(parseFloat(e.target.value) || 0)}
            />
          </label>
        </Modal>
      )}
    </div>
  );
}
