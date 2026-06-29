import { DataTable, LoadingSpinner, useAsyncData, Icons } from '@stratera/shared';
import { getHrApi } from '../api';
import { MetricCard } from '../components/MetricCard';
import { SectionHeader } from '../components/SectionHeader';
import { useHrNav } from '../context/HrNavContext';
import '../styles/hr-dashboard.css';

const api = getHrApi();
const today = new Date().toISOString().slice(0, 10);

function StatusPill({ status }: { status: string }) {
  const variant = status === 'Present' ? 'success' : 'warning';
  return <span className={`hr-status-pill ${variant}`}>{status}</span>;
}

export function Dashboard() {
  const { navigate } = useHrNav();
  const { data: stats, loading: statsLoading } = useAsyncData(() => api.getDashboardStats());
  const { data: attendance, loading: attLoading } = useAsyncData(() => api.getAttendance());
  const { data: leaveRequests, loading: leaveLoading } = useAsyncData(() => api.getLeaveRequests());

  if (statsLoading || attLoading || leaveLoading) return <LoadingSpinner />;

  const todayAttendance = (attendance ?? []).filter((a) => a.date === today);
  const pendingLeaves = (leaveRequests ?? []).filter((l) => l.status === 'Pending');
  const celebrations = stats?.celebrations ?? [];

  return (
    <div className="hr-page container-fluid px-0">
      <header className="hr-page-header">
        <div className="hr-page-header-row">
          <SectionHeader
            size="page"
            title="HR Overview"
            subtitle="Monitor workforce metrics and activity"
          />
        </div>
      </header>

      <div className="row row-cols-1 row-cols-sm-2 row-cols-xl-4 g-3 mb-4">
        <MetricCard
          label="Total Employees"
          value={String(stats?.totalEmployees ?? 0)}
          meta={`${stats?.newThisQuarter ?? 0} new this quarter`}
          metaType="positive"
          accent="employees"
          icon={<Icons.Employees />}
        />
        <div className="col" onClick={() => navigate('attendance', { dateFrom: today, dateTo: today })} style={{ cursor: 'pointer' }}>
          <MetricCard
            label="Present Today"
            value={String(stats?.presentToday ?? 0)}
            meta={stats?.attendanceRate ?? '—'}
            metaType="positive"
            accent="present"
            icon={<Icons.Attendance />}
          />
        </div>
        <div className="col" onClick={() => navigate('leave', { statusFilter: 'Approved' })} style={{ cursor: 'pointer' }}>
          <MetricCard
            label="On Leave"
            value={String(stats?.onLeave ?? 0)}
            meta="Away from office"
            metaType="neutral"
            accent="leave"
            icon={<Icons.Leave />}
          />
        </div>
        <div className="col" onClick={() => navigate('leave', { statusFilter: 'Pending' })} style={{ cursor: 'pointer' }}>
          <MetricCard
            label="Pending Requests"
            value={String(stats?.pendingRequests ?? 0)}
            meta="Awaiting approval"
            metaType="neutral"
            accent="pending"
            icon={<Icons.Leave />}
          />
        </div>
      </div>

      {celebrations.length > 0 && (
        <div className="alert alert-light border shadow-sm mb-4 py-3">
          <div className="small fw-semibold text-dark mb-2">Celebrations Today</div>
          {celebrations.map((c) => (
            <span key={`${c.employeeId}-${c.type}`} className="badge bg-primary-subtle text-primary me-2 mb-1">
              {c.employeeName} — {c.type === 'birthday' ? 'Birthday' : `${c.years}yr anniversary`}
            </span>
          ))}
        </div>
      )}

      <div className="row g-4">
        <div className="col-lg-6">
          <div className="card hr-panel-card shadow-sm h-100">
            <div className="card-header py-3">
              <SectionHeader
                title="Today's Attendance"
                subtitle="Check-in and check-out status for today"
                action={(
                  <button type="button" className="hr-link-subtle" onClick={() => navigate('attendance', { dateFrom: today })}>
                    View all
                  </button>
                )}
              />
            </div>
            <div className="card-body p-0">
              <DataTable
                columns={[
                  {
                    key: 'employee',
                    header: 'Employee',
                    render: (row) => <span className="hr-emp-name">{row.employee as string}</span>,
                  },
                  { key: 'checkIn', header: 'Check In', width: '90px' },
                  { key: 'checkOut', header: 'Check Out', width: '90px' },
                  {
                    key: 'status',
                    header: 'Status',
                    width: '110px',
                    render: (row) => <StatusPill status={row.status as string} />,
                  },
                ]}
                data={todayAttendance.slice(0, 8)}
                emptyMessage="No attendance records for today"
              />
            </div>
          </div>
        </div>

        <div className="col-lg-6">
          <div className="card hr-panel-card shadow-sm h-100">
            <div className="card-header py-3">
              <SectionHeader
                title="Pending Leave Requests"
                subtitle="Requests awaiting manager or HR approval"
                action={(
                  <button type="button" className="hr-link-subtle" onClick={() => navigate('leave', { statusFilter: 'Pending' })}>
                    View all
                  </button>
                )}
              />
            </div>
            <div className="card-body p-0">
              <DataTable
                columns={[
                  {
                    key: 'employee',
                    header: 'Employee',
                    render: (row) => <span className="hr-emp-name">{row.employee as string}</span>,
                  },
                  {
                    key: 'type',
                    header: 'Type',
                    width: '130px',
                    render: (row) => <span className="hr-cell-nowrap">{row.type as string}</span>,
                  },
                  { key: 'days', header: 'Days', width: '60px' },
                  {
                    key: 'status',
                    header: 'Status',
                    width: '100px',
                    render: (row) => <StatusPill status={row.status as string} />,
                  },
                ]}
                data={pendingLeaves}
                emptyMessage="No pending leave requests"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
