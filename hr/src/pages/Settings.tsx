import { useState, useEffect } from 'react';
import {
  Button, Icons, LoadingSpinner, useAsyncData, downloadTextFile, readFileAsText, Select, Modal, formFieldStyle,
} from '@stratera/shared';
import type { HrSettings, CreateHolidayInput } from '@stratera/shared';
import { HR_CURRENCY_OPTIONS } from '@stratera/shared';
import { getHrApi } from '../api';
import { useHrCurrency } from '../context/HrSettingsContext';
import { MetricCard } from '../components/MetricCard';
import { SectionHeader } from '../components/SectionHeader';
import '../styles/hr-dashboard.css';

const api = getHrApi();
const APP_VERSION = '1.0.0';

const workHoursLabel: Record<string, string> = {
  '8': '8 hours',
  '7.5': '7.5 hours',
  '9': '9 hours',
};

const CUSTOM_VALUE = '__custom__';

const WORK_HOURS_PRESETS = ['8', '7.5', '9'];
const SESSION_TIMEOUT_PRESETS = ['15', '30', '60'];
const ATTENDANCE_GRACE_PRESETS = ['5', '10', '15', '30'];

function formatWorkHours(value: string) {
  if (workHoursLabel[value]) return workHoursLabel[value];
  if (!value.trim()) return '—';
  return `${value} hours`;
}

function PresetOrCustomField({
  label,
  value,
  onChange,
  presets,
  options,
  customHint,
  placeholder,
  step = '1',
  min = '1',
  className = 'mb-3',
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  presets: string[];
  options: { value: string; label: string }[];
  customHint?: string;
  placeholder: string;
  step?: string;
  min?: string;
  className?: string;
}) {
  const choice = presets.includes(value) ? value : CUSTOM_VALUE;

  return (
    <div className={className}>
      <label className="form-label">{label}</label>
      <Select
        value={choice}
        onChange={(next) => {
          if (next === CUSTOM_VALUE) {
            if (!presets.includes(value)) return;
            onChange('');
            return;
          }
          onChange(next);
        }}
        options={[...options, { value: CUSTOM_VALUE, label: 'Custom — enter your own' }]}
      />
      {choice === CUSTOM_VALUE && (
        <>
          <input
            type="number"
            className="form-control form-control-sm mt-2"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            step={step}
            min={min}
          />
          {customHint && <div className="form-text">{customHint}</div>}
        </>
      )}
    </div>
  );
}

const salaryPeriodLabel: Record<string, string> = {
  monthly: 'Monthly salaries',
  biweekly: 'Bi-weekly salaries',
  weekly: 'Weekly salaries',
};

function SettingsToggle({
  label, hint, checked, onChange,
}: { label: string; hint: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="hr-settings-toggle">
      <div>
        <div className="hr-settings-toggle-label">{label}</div>
        <div className="hr-settings-toggle-hint">{hint}</div>
      </div>
      <div className="form-check form-switch m-0">
        <input className="form-check-input" type="checkbox" role="switch" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      </div>
    </div>
  );
}

export function Settings() {
  const { applyCurrency } = useHrCurrency();
  const { data: loaded, loading } = useAsyncData(() => api.getSettings());
  const { data: holidays, reload: reloadHolidays } = useAsyncData(() => api.getHolidays());
  const { data: auditLog, reload: reloadAuditLog } = useAsyncData(() => api.getAuditLog(50));
  const [settings, setSettings] = useState<HrSettings | null>(null);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const [holidayForm, setHolidayForm] = useState<CreateHolidayInput>({ name: '', date: '', recurring: true });
  const [backingUp, setBackingUp] = useState(false);
  const [showDeleteAuditModal, setShowDeleteAuditModal] = useState(false);
  const [auditDeletePassword, setAuditDeletePassword] = useState('');
  const [auditDeleteError, setAuditDeleteError] = useState<string | null>(null);
  const [deletingAudit, setDeletingAudit] = useState(false);

  useEffect(() => {
    if (loaded) setSettings({ ...loaded, currency: loaded.currency ?? 'USD' });
  }, [loaded]);

  if (loading || !settings) return <LoadingSpinner />;

  const update = <K extends keyof HrSettings>(key: K, value: HrSettings[K]) => {
    setSettings((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

  const handleSave = async () => {
    if (!settings.workHours.trim() || Number(settings.workHours) <= 0) {
      setSavedMessage('Enter a valid work hours per day value.');
      window.setTimeout(() => setSavedMessage(null), 3000);
      return;
    }
    if (!settings.sessionTimeoutMinutes.trim() || Number(settings.sessionTimeoutMinutes) <= 0) {
      setSavedMessage('Enter a valid session timeout in minutes.');
      window.setTimeout(() => setSavedMessage(null), 3000);
      return;
    }
    if (!settings.attendanceGrace.trim() || Number(settings.attendanceGrace) <= 0) {
      setSavedMessage('Enter a valid attendance grace in minutes.');
      window.setTimeout(() => setSavedMessage(null), 3000);
      return;
    }
    applyCurrency(settings.currency);
    const updated = await api.updateSettings(settings);
    const code = updated.currency?.trim() || settings.currency || 'USD';
    applyCurrency(code);
    setSettings({ ...updated, currency: code });
    setSavedMessage('Settings saved successfully.');
    window.setTimeout(() => setSavedMessage(null), 3000);
  };

  const handleAddHoliday = async () => {
    if (!holidayForm.name || !holidayForm.date) return;
    await api.createHoliday(holidayForm);
    setHolidayForm({ name: '', date: '', recurring: true });
    reloadHolidays();
  };

  const handleBackup = async () => {
    setBackingUp(true);
    try {
      const json = await api.exportHrBackup();
      downloadTextFile(`stratera-hr-backup-${new Date().toISOString().slice(0, 10)}.json`, json);
    } finally {
      setBackingUp(false);
    }
  };

  const handleRestore = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await readFileAsText(file);
    const ok = await api.importHrBackup(text);
    setSavedMessage(ok ? 'Backup restored.' : 'Restore failed.');
    e.target.value = '';
  };

  const handleDeleteAllAudit = async () => {
    setAuditDeleteError(null);
    setDeletingAudit(true);
    try {
      const result = await api.deleteAllAuditLog(auditDeletePassword);
      if (!result.ok) {
        setAuditDeleteError(result.error);
        return;
      }
      setShowDeleteAuditModal(false);
      setAuditDeletePassword('');
      setSavedMessage(result.deleted > 0 ? `Deleted ${result.deleted} audit entries.` : 'Audit log cleared.');
      window.setTimeout(() => setSavedMessage(null), 3000);
      reloadAuditLog();
    } finally {
      setDeletingAudit(false);
    }
  };

  const orgShort = settings.orgName.split(' ').slice(0, 2).join(' ');
  const auditCount = auditLog?.length ?? 0;

  return (
    <div className="hr-page container-fluid px-0">
      <header className="hr-page-header">
        <div className="hr-page-header-row">
          <SectionHeader
            size="page"
            title="Settings"
            subtitle="Configure your HR application preferences"
          />
          <div className="hr-page-actions align-items-center">
            {savedMessage && <span className="hr-settings-save-hint me-2">{savedMessage}</span>}
            <Button onClick={handleSave}>Save Changes</Button>
          </div>
        </div>
      </header>

      <div className="row row-cols-1 row-cols-md-3 g-3 mb-4">
        <MetricCard label="Organization" value={orgShort} meta={settings.orgName} accent="employees" compactValue icon={<Icons.Employees />} />
        <MetricCard label="Work Day" value={formatWorkHours(settings.workHours)} meta={`${salaryPeriodLabel[settings.payrollCycle] ?? 'Monthly salaries'} · ${settings.currency}`} accent="present" compactValue icon={<Icons.Attendance />} />
        <MetricCard label="System" value={`v${APP_VERSION}`} meta="STRATERA HR desktop" metaType="positive" accent="settings" compactValue icon={<Icons.Settings />} />
      </div>

      <div className="row g-4 hr-settings-layout">
        <div className="col-lg-7 d-flex flex-column gap-4">
          <section className="card hr-panel-card hr-settings-card shadow-sm">
            <div className="card-header py-3">
              <SectionHeader
                title="General"
                subtitle="Organization profile and core HR defaults"
              />
            </div>
            <div className="card-body">
              <div className="hr-settings-form-grid">
                <div className="hr-settings-field-span-2">
                  <label className="form-label">Organization Name</label>
                  <input type="text" className="form-control" value={settings.orgName} onChange={(e) => update('orgName', e.target.value)} />
                </div>
                <PresetOrCustomField
                  label="Work Hours Per Day"
                  value={settings.workHours}
                  onChange={(workHours) => update('workHours', workHours)}
                  presets={WORK_HOURS_PRESETS}
                  options={[
                    { value: '8', label: '8 hours' },
                    { value: '7.5', label: '7.5 hours' },
                    { value: '9', label: '9 hours' },
                  ]}
                  placeholder="e.g. 6.5"
                  step="0.5"
                  min="0.5"
                  customHint="Enter standard work hours per day (decimals allowed)."
                />
                <div>
                  <label className="form-label">Salary Period</label>
                  <Select
                    value={settings.payrollCycle}
                    onChange={(payrollCycle) => update('payrollCycle', payrollCycle)}
                    options={[
                      { value: 'monthly', label: 'Monthly' },
                      { value: 'biweekly', label: 'Bi-weekly' },
                      { value: 'weekly', label: 'Weekly' },
                    ]}
                  />
                  <div className="form-text">How base salaries are expressed on the Salaries page.</div>
                </div>
                <div>
                  <label className="form-label">Currency</label>
                  <Select
                    value={settings.currency}
                    onChange={(code) => {
                      update('currency', code);
                      applyCurrency(code);
                    }}
                    options={HR_CURRENCY_OPTIONS.map((option) => ({
                      value: option.code,
                      label: option.label,
                    }))}
                  />
                  <div className="form-text">Used for salaries and reports.</div>
                </div>
                <PresetOrCustomField
                  label="Session Timeout (minutes)"
                  value={settings.sessionTimeoutMinutes}
                  onChange={(sessionTimeoutMinutes) => update('sessionTimeoutMinutes', sessionTimeoutMinutes)}
                  presets={SESSION_TIMEOUT_PRESETS}
                  options={[
                    { value: '15', label: '15 minutes' },
                    { value: '30', label: '30 minutes' },
                    { value: '60', label: '60 minutes' },
                  ]}
                  placeholder="e.g. 45"
                  step="1"
                  min="1"
                  customHint="Inactive session sign-out time."
                  className="mb-0"
                />
              </div>
            </div>
          </section>

          <section className="card hr-panel-card hr-settings-card shadow-sm">
            <div className="card-header py-3">
              <SectionHeader
                title="Policies"
                subtitle="Leave approval and attendance rules"
              />
            </div>
            <div className="card-body">
              <div className="hr-settings-form-grid">
                <div>
                  <label className="form-label">Leave Approval</label>
                  <Select
                    value={settings.leaveApproval}
                    onChange={(leaveApproval) => update('leaveApproval', leaveApproval)}
                    options={[
                      { value: 'manager', label: 'Department manager' },
                      { value: 'hr', label: 'HR administrator' },
                      { value: 'both', label: 'Manager then HR' },
                    ]}
                  />
                </div>
                <PresetOrCustomField
                  label="Attendance Grace (minutes)"
                  value={settings.attendanceGrace}
                  onChange={(attendanceGrace) => update('attendanceGrace', attendanceGrace)}
                  presets={ATTENDANCE_GRACE_PRESETS}
                  options={[
                    { value: '5', label: '5 minutes' },
                    { value: '10', label: '10 minutes' },
                    { value: '15', label: '15 minutes' },
                    { value: '30', label: '30 minutes' },
                  ]}
                  placeholder="e.g. 20"
                  step="1"
                  min="1"
                  customHint="Grace period before marking check-in as late."
                  className="mb-0"
                />
              </div>
            </div>
          </section>

          <section className="card hr-panel-card hr-settings-card shadow-sm">
            <div className="card-header py-3">
              <SectionHeader
                title="Leave Entitlements (Ghana Labour Act, 2003)"
                subtitle="Configurable defaults under Act 651 — annual, sick, maternity, and paternity leave"
              />
            </div>
            <div className="card-body">
              <div className="hr-settings-form-grid">
                <PresetOrCustomField
                  label="Annual Leave — Standard (working days)"
                  value={settings.leaveAnnualDays}
                  onChange={(leaveAnnualDays) => update('leaveAnnualDays', leaveAnnualDays)}
                  presets={['15']}
                  options={[{ value: '15', label: '15 days (Act 651 minimum)' }]}
                  placeholder="15"
                  customHint="Minimum 15 working days after 12 months of service."
                />
                <PresetOrCustomField
                  label="Annual Leave — Underground Mining (working days)"
                  value={settings.leaveUndergroundDays}
                  onChange={(leaveUndergroundDays) => update('leaveUndergroundDays', leaveUndergroundDays)}
                  presets={['21']}
                  options={[{ value: '21', label: '21 days' }]}
                  placeholder="21"
                  customHint="Underground mining staff entitlement."
                />
                <PresetOrCustomField
                  label="Sick Leave Default (working days/year)"
                  value={settings.leaveSickDays}
                  onChange={(leaveSickDays) => update('leaveSickDays', leaveSickDays)}
                  presets={['12']}
                  options={[{ value: '12', label: '12 days' }]}
                  placeholder="12"
                  customHint="Not fixed by law — HR can adjust."
                />
                <PresetOrCustomField
                  label="Maternity Leave (calendar days)"
                  value={settings.leaveMaternityDays}
                  onChange={(leaveMaternityDays) => update('leaveMaternityDays', leaveMaternityDays)}
                  presets={['84']}
                  options={[{ value: '84', label: '84 days (12 weeks)' }]}
                  placeholder="84"
                />
                <PresetOrCustomField
                  label="Paternity Leave (working days)"
                  value={settings.leavePaternityDays}
                  onChange={(leavePaternityDays) => update('leavePaternityDays', leavePaternityDays)}
                  presets={['5']}
                  options={[{ value: '5', label: '5 days' }]}
                  placeholder="5"
                />
                <PresetOrCustomField
                  label="Seniority Bonus — Years of Service"
                  value={settings.leaveSeniorityYears}
                  onChange={(leaveSeniorityYears) => update('leaveSeniorityYears', leaveSeniorityYears)}
                  presets={['5']}
                  options={[{ value: '5', label: '5 years' }]}
                  placeholder="5"
                />
                <PresetOrCustomField
                  label="Seniority Bonus — Extra Days"
                  value={settings.leaveSeniorityBonusDays}
                  onChange={(leaveSeniorityBonusDays) => update('leaveSeniorityBonusDays', leaveSeniorityBonusDays)}
                  presets={['3']}
                  options={[{ value: '3', label: '+3 days' }]}
                  placeholder="3"
                />
                <PresetOrCustomField
                  label="Sick Leave — Medical Certificate After (days)"
                  value={settings.leaveSickMedicalCertDays}
                  onChange={(leaveSickMedicalCertDays) => update('leaveSickMedicalCertDays', leaveSickMedicalCertDays)}
                  presets={['2']}
                  options={[{ value: '2', label: '2 consecutive days' }]}
                  placeholder="2"
                  customHint="Sick leave exceeding this requires a medical certificate before HR approval."
                  className="mb-0"
                />
              </div>
            </div>
          </section>

          <section className="card hr-panel-card shadow-sm">
            <div className="card-header py-3">
              <SectionHeader
                title="Audit Log"
                subtitle={`${auditCount} recent entries · system activity history`}
                action={(
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => {
                      setAuditDeletePassword('');
                      setAuditDeleteError(null);
                      setShowDeleteAuditModal(true);
                    }}
                    disabled={auditCount === 0}
                  >
                    Delete all audits
                  </Button>
                )}
              />
            </div>
            <div className="table-responsive">
              <table className="table table-sm mb-0 hr-settings-audit-table">
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>User</th>
                    <th>Action</th>
                    <th>Details</th>
                  </tr>
                </thead>
                <tbody>
                  {auditCount === 0 ? (
                    <tr>
                      <td colSpan={4} className="text-center text-muted small py-4">No audit entries recorded yet.</td>
                    </tr>
                  ) : (
                    (auditLog ?? []).map((a) => (
                      <tr key={a.id}>
                        <td className="small text-muted text-nowrap">{new Date(a.timestamp).toLocaleString()}</td>
                        <td className="small">{a.userName}</td>
                        <td className="small text-nowrap">{a.action} · {a.entity}</td>
                        <td className="small text-secondary">{a.details}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <div className="col-lg-5 d-flex flex-column gap-4">
          <section className="card hr-panel-card hr-settings-card shadow-sm">
            <div className="card-header py-3">
              <SectionHeader
                title="Email & Notifications"
                subtitle="SMTP delivery and alert preferences"
              />
            </div>
            <div className="card-body">
              <SettingsToggle label="SMTP enabled" hint="Use configured mail server for notifications" checked={settings.smtpEnabled} onChange={(v) => update('smtpEnabled', v)} />
              {settings.smtpEnabled && (
                <div className="row g-2 mb-3 hr-settings-smtp-grid">
                  <div className="col-8">
                    <input type="text" className="form-control form-control-sm" placeholder="SMTP host" value={settings.smtpHost} onChange={(e) => update('smtpHost', e.target.value)} />
                  </div>
                  <div className="col-4">
                    <input type="text" className="form-control form-control-sm" placeholder="Port" value={settings.smtpPort} onChange={(e) => update('smtpPort', e.target.value)} />
                  </div>
                  <div className="col-12">
                    <input type="email" className="form-control form-control-sm" placeholder="SMTP username" value={settings.smtpUser} onChange={(e) => update('smtpUser', e.target.value)} />
                  </div>
                  <div className="col-12">
                    <input type="password" className="form-control form-control-sm" placeholder="SMTP password" value={settings.smtpPassword} onChange={(e) => update('smtpPassword', e.target.value)} />
                  </div>
                  <div className="col-12">
                    <input type="email" className="form-control form-control-sm" placeholder="From address" value={settings.smtpFrom} onChange={(e) => update('smtpFrom', e.target.value)} />
                  </div>
                </div>
              )}
              <div className="hr-settings-toggle-group">
                <SettingsToggle label="Leave request emails" hint="Notify on new leave requests" checked={settings.emailLeaveRequests} onChange={(v) => update('emailLeaveRequests', v)} />
                <SettingsToggle label="Attendance digest" hint="Daily attendance summary" checked={settings.emailAttendance} onChange={(v) => update('emailAttendance', v)} />
              </div>
            </div>
          </section>

          <section className="card hr-panel-card shadow-sm">
            <div className="card-header py-3">
              <SectionHeader
                title="Company Holidays"
                subtitle="Public holidays excluded from attendance"
              />
            </div>
            <div className="card-body">
              <div className="row g-2 mb-3 align-items-end">
                <div className="col-sm-5">
                  <label className="form-label small mb-1">Name</label>
                  <input type="text" className="form-control form-control-sm" placeholder="Holiday name" value={holidayForm.name} onChange={(e) => setHolidayForm({ ...holidayForm, name: e.target.value })} />
                </div>
                <div className="col-sm-4">
                  <label className="form-label small mb-1">Date</label>
                  <input type="date" className="form-control form-control-sm" value={holidayForm.date} onChange={(e) => setHolidayForm({ ...holidayForm, date: e.target.value })} />
                </div>
                <div className="col-sm-3">
                  <Button size="sm" onClick={handleAddHoliday} style={{ width: '100%', justifyContent: 'center' }}>
                    Add
                  </Button>
                </div>
              </div>
              <div className="hr-settings-holiday-list">
                {(holidays ?? []).length === 0 ? (
                  <p className="text-muted small mb-0 py-2">No holidays added yet.</p>
                ) : (
                  (holidays ?? []).map((h) => (
                    <div key={h.id} className="hr-settings-holiday-row">
                      <span>{h.name}</span>
                      <span className="text-muted">{h.date}</span>
                      <button type="button" className="btn btn-link btn-sm text-danger p-0" onClick={() => api.deleteHoliday(h.id).then(() => reloadHolidays())}>Remove</button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </section>

          <section className="card hr-panel-card shadow-sm">
            <div className="card-header py-3">
              <SectionHeader
                title="Backup & Restore"
                subtitle="Export or import HR data"
              />
            </div>
            <div className="card-body">
              <p className="small text-secondary mb-3">Includes employees, attendance, leave, and settings.</p>
              <div className="d-flex flex-wrap gap-2">
                <Button onClick={handleBackup} disabled={backingUp}>Export Backup</Button>
                <label className="btn btn-outline-secondary btn-sm mb-0 d-inline-flex align-items-center">
                  Restore Backup
                  <input type="file" accept=".json" className="d-none" onChange={handleRestore} />
                </label>
              </div>
            </div>
          </section>
        </div>
      </div>

      {showDeleteAuditModal && (
        <Modal
          title="Delete all audit entries"
          onClose={() => {
            if (deletingAudit) return;
            setShowDeleteAuditModal(false);
            setAuditDeletePassword('');
            setAuditDeleteError(null);
          }}
          onSubmit={handleDeleteAllAudit}
          submitLabel={deletingAudit ? 'Deleting…' : 'Delete all audits'}
          loading={deletingAudit}
        >
          <div style={formFieldStyle.grid}>
            <p style={{ fontSize: 14, color: '#475569', lineHeight: 1.55, margin: 0 }}>
              This permanently removes every audit log entry. Enter your account password to confirm.
            </p>
            <label style={formFieldStyle.field}>
              <span style={formFieldStyle.label}>Password</span>
              <input
                type="password"
                style={formFieldStyle.input}
                value={auditDeletePassword}
                onChange={(e) => {
                  setAuditDeletePassword(e.target.value);
                  setAuditDeleteError(null);
                }}
                placeholder="Your sign-in password"
                autoFocus
              />
            </label>
            {auditDeleteError && (
              <p style={{ fontSize: 13, color: '#ef4444', margin: 0 }}>{auditDeleteError}</p>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
