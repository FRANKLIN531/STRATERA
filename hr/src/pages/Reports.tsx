import { useState } from 'react';
import {
  Button, LoadingSpinner, useAsyncData, Icons, Select,
  exportEmployeeReportPdf, exportEmployeesDirectoryPdf, exportToCsv,
} from '@stratera/shared';
import { getHrApi } from '../api';
import { MetricCard } from '../components/MetricCard';
import { SectionHeader } from '../components/SectionHeader';
import '../styles/hr-dashboard.css';

const api = getHrApi();

export function Reports() {
  const { data: employees, loading } = useAsyncData(() => api.getEmployees());
  const { data: attendance } = useAsyncData(() => api.getAttendance());
  const { data: leave } = useAsyncData(() => api.getLeaveRequests());
  const [selectedId, setSelectedId] = useState('');
  const [generating, setGenerating] = useState(false);

  const list = employees ?? [];
  const attendanceCount = (attendance ?? []).length;
  const leaveCount = (leave ?? []).length;

  const handleEmployeeReport = async () => {
    if (!selectedId) return;
    setGenerating(true);
    try {
      const employee = list.find((e) => e.id === selectedId);
      if (!employee) return;
      exportEmployeeReportPdf({
        employee,
        attendance: (attendance ?? []).filter((a) => a.employee === employee.name),
        leave: (leave ?? []).filter((l) => l.employee === employee.name),
        payroll: [],
      });
    } finally {
      setGenerating(false);
    }
  };

  const handleDirectoryReport = () => {
    exportEmployeesDirectoryPdf(list);
  };

  const exportEmployeesCsv = () => {
    exportToCsv('employees.csv', ['ID', 'Name', 'Department', 'Role', 'Email', 'Status', 'Salary', 'Join Date'],
      list.map((e) => [e.id, e.name, e.department, e.role, e.email, e.status, String(e.salary), e.joinDate]));
  };

  const exportAttendanceCsv = () => {
    const rows = attendance ?? [];
    exportToCsv('attendance.csv', ['ID', 'Employee', 'Date', 'Check In', 'Check Out', 'Hours', 'Status'],
      rows.map((a) => [a.id, a.employee, a.date, a.checkIn, a.checkOut, String(a.hours), a.status]));
  };

  const exportLeaveCsv = () => {
    const rows = leave ?? [];
    exportToCsv('leave.csv', ['ID', 'Employee', 'Type', 'Start', 'End', 'Days', 'Status'],
      rows.map((l) => [l.id, l.employee, l.type, l.startDate, l.endDate, String(l.days), l.status]));
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="hr-page container-fluid px-0">
      <header className="hr-page-header">
        <div className="hr-page-header-row">
          <SectionHeader
            size="page"
            title="Reports"
            subtitle="Generate employee and HR reports as PDF"
          />
        </div>
      </header>

      <div className="row row-cols-1 row-cols-sm-2 row-cols-xl-3 g-3 mb-4">
        <MetricCard
          label="Employees"
          value={String(list.length)}
          meta="Directory export ready"
          accent="employees"
          icon={<Icons.Employees />}
        />
        <MetricCard
          label="Attendance"
          value={String(attendanceCount)}
          meta="Records in reports"
          accent="present"
          icon={<Icons.Attendance />}
        />
        <MetricCard
          label="Leave Requests"
          value={String(leaveCount)}
          meta="Included in employee PDFs"
          accent="leave"
          icon={<Icons.Leave />}
        />
      </div>

      <div className="row g-4">
        <div className="col-lg-6">
          <div className="card hr-panel-card hr-settings-card shadow-sm h-100">
            <div className="card-header py-3">
              <SectionHeader
                title="Employee Directory Report"
                subtitle="Export all employees with department, position, and salary"
              />
            </div>
            <div className="card-body">
              <p className="small text-secondary mb-3">
                Includes {list.length} employees across all departments. Useful for audits and management reviews.
              </p>
              <div className="d-flex flex-wrap align-items-center gap-2">
                <Button onClick={handleDirectoryReport}>
                  <Icons.Reports />
                  Export Directory PDF
                </Button>
                <Button onClick={exportEmployeesCsv}>Export CSV</Button>
              </div>
            </div>
          </div>
        </div>

        <div className="col-lg-6">
          <div className="card hr-panel-card hr-settings-card shadow-sm h-100">
            <div className="card-header py-3">
              <SectionHeader
                title="Data Exports (CSV)"
                subtitle="Spreadsheet exports for finance and audits"
              />
            </div>
            <div className="card-body d-flex flex-wrap align-items-center gap-2">
              <Button size="sm" onClick={exportAttendanceCsv}>Attendance CSV</Button>
              <Button size="sm" onClick={exportLeaveCsv}>Leave CSV</Button>
            </div>
          </div>
        </div>

        <div className="col-lg-6">
          <div className="card hr-panel-card hr-settings-card shadow-sm h-100">
            <div className="card-header py-3">
              <SectionHeader
                title="Individual Employee Report"
                subtitle="Full profile with attendance and leave history"
              />
            </div>
            <div className="card-body">
              <label className="form-label small fw-semibold text-secondary">Select employee</label>
              <Select
                className="mb-3"
                value={selectedId}
                onChange={setSelectedId}
                placeholder="Choose an employee..."
                options={[
                  { value: '', label: 'Choose an employee...' },
                  ...list.map((e) => ({ value: e.id, label: `${e.name} — ${e.department}` })),
                ]}
              />
              <Button onClick={handleEmployeeReport} disabled={!selectedId || generating}>
                <Icons.Reports />
                {generating ? 'Generating...' : 'Generate Employee PDF'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
