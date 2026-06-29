import { useMemo, useState } from 'react';
import { LoadingSpinner, useAsyncData, Icons, Button } from '@stratera/shared';
import type { Employee } from '@stratera/shared';
import { getHrApi } from '../api';
import { MetricCard } from '../components/MetricCard';
import type { MetricAccent } from '../components/MetricCard';
import { SectionHeader } from '../components/SectionHeader';
import { EmptyState } from '../components/EmptyState';
import { useHrNav } from '../context/HrNavContext';
import { useHrCurrency } from '../context/HrSettingsContext';
import '../styles/hr-dashboard.css';

const api = getHrApi();

const DEPT_ACCENTS: MetricAccent[] = [
  'departments',
  'employees',
  'present',
  'payroll',
  'pending',
  'reports',
];

function employeeInitials(name: string) {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function statusPillClass(status: string) {
  if (status === 'Active') return 'success';
  if (status === 'On Leave') return 'warning';
  return '';
}

export function OrgChart() {
  const { navigate } = useHrNav();
  const { settings } = useHrCurrency();
  const { data: departments, loading: dLoading } = useAsyncData(() => api.getDepartments());
  const { data: employees, loading: eLoading } = useAsyncData(() => api.getEmployees());
  const [search, setSearch] = useState('');

  const deptList = departments ?? [];
  const empList = (employees ?? []).filter((e) => e.status !== 'Terminated');
  const orgName = settings?.orgName?.trim() || 'Organization';

  const largestDept = deptList.length > 0
    ? deptList.reduce((max, d) => d.employees > max.employees ? d : max, deptList[0])
    : null;

  const assignedDeptNames = useMemo(() => new Set(deptList.map((d) => d.name)), [deptList]);
  const unassigned = useMemo(
    () => empList.filter((e) => !assignedDeptNames.has(e.department)),
    [empList, assignedDeptNames],
  );

  const filteredDepts = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return deptList;
    return deptList.filter((dept) => {
      if (dept.name.toLowerCase().includes(q)) return true;
      return empList.some(
        (e) =>
          e.department === dept.name &&
          (e.name.toLowerCase().includes(q) ||
            e.email.toLowerCase().includes(q) ||
            e.role.toLowerCase().includes(q)),
      );
    });
  }, [deptList, empList, search]);

  if (dLoading || eLoading) return <LoadingSpinner />;

  const renderMember = (employee: Employee) => (
    <button
      key={employee.id}
      type="button"
      className="hr-org-member"
      onClick={() => navigate('employee-profile', { employeeId: employee.id })}
    >
      <span className="hr-emp-avatar hr-emp-avatar-sm">{employeeInitials(employee.name)}</span>
      <span className="hr-org-member__main">
        <span className="hr-org-member__name">{employee.name}</span>
        <span className="hr-org-member__meta">{employee.role}</span>
      </span>
      <span className="hr-org-member__email">{employee.email}</span>
      <span className={`hr-status-pill ${statusPillClass(employee.status)}`}>{employee.status}</span>
    </button>
  );

  return (
    <div className="hr-page container-fluid px-0">
      <header className="hr-page-header">
        <div className="hr-page-header-row">
          <SectionHeader
            size="page"
            title="Organization Chart"
            subtitle="Departments and team members at a glance"
          />
          <div className="hr-page-actions">
            <Button variant="secondary" size="sm" onClick={() => navigate('departments')}>
              Manage Departments
            </Button>
          </div>
        </div>
      </header>

      <div className="row row-cols-1 row-cols-sm-2 row-cols-xl-4 g-3 mb-4">
        <MetricCard
          label="Departments"
          value={String(deptList.length)}
          meta="Organization units"
          accent="departments"
          icon={<Icons.Departments />}
        />
        <MetricCard
          label="Team Members"
          value={String(empList.length)}
          meta="Active employees"
          metaType="positive"
          accent="employees"
          icon={<Icons.Employees />}
        />
        <MetricCard
          label="Largest Team"
          value={largestDept ? largestDept.name : '—'}
          meta={largestDept ? `${largestDept.employees} members` : 'No departments yet'}
          accent="present"
          compactValue
          icon={<Icons.TrendUp />}
        />
        <MetricCard
          label="Unassigned"
          value={String(unassigned.length)}
          meta={unassigned.length > 0 ? 'Need department assignment' : 'All employees placed'}
          metaType={unassigned.length > 0 ? 'neutral' : 'positive'}
          accent="pending"
          icon={<Icons.Reports />}
        />
      </div>

      {deptList.length === 0 ? (
        <div className="card hr-panel-card shadow-sm">
          <div className="hr-empty-state-panel">
            <EmptyState
              icon={<Icons.Departments />}
              accent="departments"
              title="Build your organization chart"
              description="Create departments and assign employees to visualize your company structure."
              tips={[
                'Add departments under the Departments page',
                'Assign each employee to a department',
                'Return here to see teams grouped by unit',
              ]}
              actionLabel="Go to Departments"
              actionIcon={<Icons.Departments />}
              onAction={() => navigate('departments')}
            />
          </div>
        </div>
      ) : (
        <>
          <div className="hr-org-toolbar card hr-panel-card shadow-sm mb-4">
            <div className="card-body py-3">
              <div className="row g-3 align-items-center">
                <div className="col-lg-6">
                  <SectionHeader
                    title="Company Structure"
                    subtitle={`${orgName} · ${deptList.length} departments · ${empList.length} people`}
                  />
                </div>
                <div className="col-lg-6">
                  <div className="input-group input-group-sm hr-directory-search">
                    <span className="input-group-text bg-white">
                      <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M11 18a7 7 0 100-14 7 7 0 000 14z" />
                      </svg>
                    </span>
                    <input
                      type="search"
                      className="form-control"
                      placeholder="Search departments or team members..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="hr-org-chart-layout">
            <div className="hr-org-hub" aria-hidden>
              <div className="hr-org-hub-node">
                <span className="hr-org-hub-icon">
                  <Icons.Employees />
                </span>
                <span className="hr-org-hub-name">{orgName}</span>
                <span className="hr-org-hub-meta">
                  {deptList.length} {deptList.length === 1 ? 'department' : 'departments'}
                </span>
              </div>
              <div className="hr-org-hub-connector" />
            </div>

            <div className="row g-4 hr-org-dept-grid">
              {filteredDepts.length === 0 ? (
                <div className="col-12">
                  <div className="card hr-panel-card shadow-sm">
                    <div className="card-body py-5 text-center text-muted small">
                      No departments or team members match your search.
                    </div>
                  </div>
                </div>
              ) : (
                filteredDepts.map((dept, index) => {
                  const deptEmployees = empList.filter((e) => e.department === dept.name);
                  const accent = DEPT_ACCENTS[index % DEPT_ACCENTS.length];
                  return (
                    <div key={dept.id} className="col-lg-6">
                      <article className={`hr-org-dept-card hr-org-dept-card--${accent}`}>
                        <div className="hr-org-dept-card__header">
                          <span className="hr-org-dept-card__icon">
                            <Icons.Departments />
                          </span>
                          <div className="hr-org-dept-card__titles">
                            <h3 className="hr-org-dept-card__name">{dept.name}</h3>
                            <p className="hr-org-dept-card__subtitle">
                              {deptEmployees.length}{' '}
                              {deptEmployees.length === 1 ? 'team member' : 'team members'}
                            </p>
                          </div>
                          <span className="hr-org-dept-card__count">{deptEmployees.length}</span>
                        </div>
                        <div className="hr-org-dept-card__body">
                          {deptEmployees.length === 0 ? (
                            <p className="hr-org-dept-empty">No employees assigned to this department yet.</p>
                          ) : (
                            <div className="hr-org-member-list">
                              {deptEmployees.map(renderMember)}
                            </div>
                          )}
                        </div>
                      </article>
                    </div>
                  );
                })
              )}
            </div>

            {unassigned.length > 0 && !search.trim() && (
              <div className="row g-4 mt-1">
                <div className="col-12">
                  <article className="hr-org-dept-card hr-org-dept-card--settings">
                    <div className="hr-org-dept-card__header">
                      <span className="hr-org-dept-card__icon">
                        <Icons.Employees />
                      </span>
                      <div className="hr-org-dept-card__titles">
                        <h3 className="hr-org-dept-card__name">Unassigned</h3>
                        <p className="hr-org-dept-card__subtitle">
                          Employees without a matching department
                        </p>
                      </div>
                      <span className="hr-org-dept-card__count">{unassigned.length}</span>
                    </div>
                    <div className="hr-org-dept-card__body">
                      <div className="hr-org-member-list">
                        {unassigned.map(renderMember)}
                      </div>
                    </div>
                  </article>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
