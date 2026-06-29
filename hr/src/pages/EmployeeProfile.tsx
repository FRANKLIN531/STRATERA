import { useState } from 'react';
import {
  Button, LoadingSpinner, useAsyncData, Modal, formFieldStyle, Icons,
  exportEmployeeReportPdf, readFileAsBase64, BackLink,
} from '@stratera/shared';
import type { TerminateEmployeeInput } from '@stratera/shared';
import { getHrApi } from '../api';
import { useHrCurrency } from '../context/HrSettingsContext';
import { MetricCard } from '../components/MetricCard';
import { SectionHeader } from '../components/SectionHeader';
import { useHrNav, useHrNavState } from '../context/HrNavContext';
import '../styles/hr-dashboard.css';

const api = getHrApi();

export function EmployeeProfile() {
  const { formatCurrency } = useHrCurrency();
  const { navigate } = useHrNav();
  const { employeeId } = useHrNavState();
  const { data: employees, loading, reload } = useAsyncData(() => api.getEmployees());
  const { data: attendance } = useAsyncData(() => api.getAttendance());
  const { data: leave } = useAsyncData(() => api.getLeaveRequests());
  const { data: notes, reload: reloadNotes } = useAsyncData(
    () => (employeeId ? api.getEmployeeNotes(employeeId) : Promise.resolve([])),
    [employeeId],
  );
  const { data: documents, reload: reloadDocs } = useAsyncData(
    () => (employeeId ? api.getEmployeeDocuments(employeeId) : Promise.resolve([])),
    [employeeId],
  );
  const { data: balances } = useAsyncData(() => api.getLeaveBalances());

  const [noteText, setNoteText] = useState('');
  const [showTerminate, setShowTerminate] = useState(false);
  const [terminateReason, setTerminateReason] = useState('');
  const [terminateError, setTerminateError] = useState('');
  const [saving, setSaving] = useState(false);

  const employee = (employees ?? []).find((e) => e.id === employeeId);

  if (loading) return <LoadingSpinner />;

  if (!employee) {
    return (
      <div className="text-center py-5">
        <p className="text-muted mb-3">No employee selected.</p>
        <BackLink label="Employees" variant="pill" onClick={() => navigate('employees')} />
      </div>
    );
  }

  const empAttendance = (attendance ?? []).filter((a) => a.employee === employee.name);
  const empLeave = (leave ?? []).filter((l) => l.employee === employee.name);
  const balance = (balances ?? []).find((b) => b.employeeId === employee.id);

  const handleAddNote = async () => {
    if (!noteText.trim()) return;
    setSaving(true);
    try {
      await api.createEmployeeNote({ employeeId: employee.id, note: noteText.trim() });
      setNoteText('');
      reloadNotes();
    } finally {
      setSaving(false);
    }
  };

  const handleDocUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fileData = await readFileAsBase64(file);
    await api.addEmployeeDocument({
      employeeId: employee.id,
      name: file.name,
      fileName: file.name,
      fileData,
    });
    reloadDocs();
    e.target.value = '';
  };

  const handleDownloadDoc = async (docId: string) => {
    const data = await api.getEmployeeDocumentData(docId);
    if (!data) return;
    const link = document.createElement('a');
    link.href = `data:application/octet-stream;base64,${data.fileData}`;
    link.download = data.fileName;
    link.click();
  };

  const handleTerminate = async () => {
    if (!terminateReason.trim()) return;
    setSaving(true);
    setTerminateError('');
    try {
      await api.terminateEmployee({
        employeeId: employee.id,
        reason: terminateReason.trim(),
      } as TerminateEmployeeInput);
      setShowTerminate(false);
      reload();
      navigate('employees');
    } catch (err) {
      setTerminateError(err instanceof Error ? err.message : 'Termination failed.');
    } finally {
      setSaving(false);
    }
  };

  const handleExportPdf = () => {
    exportEmployeeReportPdf({
      employee,
      attendance: empAttendance,
      leave: empLeave,
      payroll: [],
    });
  };

  return (
    <div className="hr-page container-fluid px-0">
      <header className="hr-page-header">
        <BackLink label="Employees" variant="pill" onClick={() => navigate('employees')} />
        <div className="hr-page-header-row">
          <div>
            <SectionHeader
              size="page"
              title={employee.name}
              subtitle={`${employee.department} · ${employee.role}`}
            />
          </div>
          <div className="hr-page-actions">
            <Button onClick={handleExportPdf}><Icons.Reports /> Export PDF</Button>
            {employee.status !== 'Terminated' && (
              <Button onClick={() => setShowTerminate(true)} style={{ background: '#b91c1c' }}>
                Terminate
              </Button>
            )}
          </div>
        </div>
      </header>

      <div className="row row-cols-1 row-cols-sm-2 row-cols-xl-4 g-3 mb-4">
        <MetricCard label="Status" value={employee.status} meta={employee.phone || employee.email} accent="employees" compactValue icon={<Icons.Employees />} />
        <MetricCard label="Salary" value={formatCurrency(employee.salary)} meta="Monthly base" accent="salaries" compactValue icon={<Icons.Dollar />} />
        <MetricCard
          label="Leave Balance"
          value={balance ? `${balance.annualRemaining}d annual` : '—'}
          meta={
            balance
              ? `${balance.sickRemaining}d sick · ${balance.maternityRemaining}d maternity · ${balance.paternityRemaining}d paternity`
              : '—'
          }
          accent="leave"
          compactValue
          icon={<Icons.Leave />}
        />
        <MetricCard label="Joined" value={employee.joinDate} meta={employee.email} accent="present" compactValue icon={<Icons.Attendance />} />
      </div>

      <div className="row g-4">
        <div className="col-lg-6">
          <div className="card hr-panel-card shadow-sm">
            <div className="card-header py-3">
              <SectionHeader
                title="HR Notes"
                subtitle="Private notes visible only to HR administrators"
              />
            </div>
            <div className="card-body">
              <textarea className="form-control form-control-sm mb-2" rows={3} placeholder="Add private HR note..." value={noteText} onChange={(e) => setNoteText(e.target.value)} />
              <Button onClick={handleAddNote} disabled={saving}>Add Note</Button>
              <div className="mt-3">
                {(notes ?? []).map((n) => (
                  <div key={n.id} className="border rounded p-2 mb-2 small">
                    <div className="text-secondary">{n.note}</div>
                    <div className="text-muted" style={{ fontSize: '0.7rem' }}>{n.createdBy} · {new Date(n.createdAt).toLocaleDateString()}</div>
                  </div>
                ))}
                {(notes ?? []).length === 0 && <p className="text-muted small">No notes yet.</p>}
              </div>
            </div>
          </div>
        </div>

        <div className="col-lg-6">
          <div className="card hr-panel-card shadow-sm">
            <div className="card-header py-3">
              <SectionHeader
                title="Documents"
                subtitle="Contracts, IDs, and employee files"
                action={(
                  <label className="btn btn-sm btn-outline-primary mb-0">
                    Upload
                    <input type="file" className="d-none" onChange={handleDocUpload} />
                  </label>
                )}
              />
            </div>
            <div className="card-body">
              {(documents ?? []).map((d) => (
                <div key={d.id} className="d-flex justify-content-between align-items-center border rounded p-2 mb-2 small">
                  <span>{d.name}</span>
                  <button type="button" className="btn btn-link btn-sm p-0" onClick={() => handleDownloadDoc(d.id)}>Download</button>
                </div>
              ))}
              {(documents ?? []).length === 0 && <p className="text-muted small">No documents uploaded.</p>}
            </div>
          </div>
        </div>

        <div className="col-12">
          <div className="card hr-panel-card shadow-sm">
            <div className="card-header py-3">
              <SectionHeader
                title="Recent Activity"
                subtitle="Attendance and leave summary for this employee"
              />
            </div>
            <div className="card-body small text-secondary">
              <p>{empAttendance.length} attendance records · {empLeave.length} leave requests</p>
              {employee.terminationReason && (
                <p className="text-danger">Termination: {employee.terminationReason} ({employee.endDate})</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {showTerminate && (
        <Modal title="Terminate Employee" onClose={() => setShowTerminate(false)} onSubmit={handleTerminate} loading={saving} submitLabel="Confirm Termination">
          <p className="small text-secondary mb-3">This will mark {employee.name} as terminated and remove them from active lists. Termination is blocked while an employee is on approved maternity leave.</p>
          <label className="form-label small">Reason</label>
          <textarea className="form-control" style={formFieldStyle} rows={3} value={terminateReason} onChange={(e) => setTerminateReason(e.target.value)} />
          {terminateError && <p className="small text-danger mt-2 mb-0">{terminateError}</p>}
        </Modal>
      )}
    </div>
  );
}
