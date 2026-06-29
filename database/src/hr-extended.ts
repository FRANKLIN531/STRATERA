import {
  classifyLeaveType,
  calculateEmployeeEntitlements,
  canEmployeeTakeLeave,
  employeeLeaveProfileFromRow,
  isEmployeeOnMaternityLeave,
  policyFromSettings,
  validateLeaveRequest,
} from './leave-entitlements';
import { matchEmployeeByEmail, matchEmployeeByPhone } from './check-in-kiosk';
import type {
  HrSettings,
  LeaveBalance,
  Holiday,
  EmployeeNote,
  EmployeeDocument,
  AuditLogEntry,
  HrNotification,
  MessageTemplate,
  AttendanceTrend,
  DepartmentCostReport,
  Celebration,
  AccountingSyncStatus,
  CreateHolidayInput,
  CreateEmployeeNoteInput,
  CreateDocumentInput,
  CreateMessageTemplateInput,
  UpdateLeaveBalanceInput,
  TerminateEmployeeInput,
  AttendanceRecord,
  CreateAttendanceInput,
  HrDashboardStats,
  LeaveRequest,
  AttendanceScanLogEntry,
  KioskCheckInConfig,
  CheckInLookupInput,
  CheckInLookupResult,
  CheckInConfirmInput,
  CheckInConfirmResult,
} from './types';
import type { DbClient } from './db-client';
import {
  sqlAttendanceSinceDaysAgo,
  sqlReplaceRow,
  sqlUpsertKeyValue,
  sqlUpsertLeaveBalance,
} from './dialect';

type AuditCtx = { userName: string };

export class HrExtendedDb {
  constructor(
    private db: DbClient,
    private auditCtx: AuditCtx = { userName: 'System' },
  ) {}

  setAuditUser(name: string): void {
    this.auditCtx.userName = name;
  }

  private log(action: string, entity: string, entityId: string, details: string): void {
    const id = `AUD-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const ts = new Date().toISOString();
    this.db
      .prepare(
        'INSERT INTO audit_log (id, action, entity, entity_id, details, user_name, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?)',
      )
      .run(id, action, entity, entityId, details, this.auditCtx.userName, ts);
  }

  notify(type: string, title: string, message: string, linkPage?: string): void {
    const id = `NOT-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    this.db
      .prepare(
        'INSERT INTO hr_notifications (id, type, title, message, read, created_at, link_page) VALUES (?, ?, ?, ?, 0, ?, ?)',
      )
      .run(id, type, title, message, new Date().toISOString(), linkPage ?? null);
  }

  private getSetting(key: string, fallback = ''): string {
    const row = this.db.prepare('SELECT value FROM hr_settings WHERE key = ?').get(key) as
      | { value: string }
      | undefined;
    return row?.value ?? fallback;
  }

  private setSetting(key: string, value: string): void {
    this.db
      .prepare(sqlUpsertKeyValue(this.db.engine, 'hr_settings', 'key', 'value'))
      .run(key, value);
  }

  getSettings(): HrSettings {
    return {
      orgName: this.getSetting('orgName', 'STRATERA R&D Software Group'),
      workHours: this.getSetting('workHours', '8'),
      payrollCycle: this.getSetting('payrollCycle', 'monthly'),
      payrollDeductionRate: this.getSetting('payrollDeductionRate', '22'),
      payrollDeductionFixed: this.getSetting('payrollDeductionFixed', '0'),
      leaveApproval: this.getSetting('leaveApproval', 'manager'),
      attendanceGrace: this.getSetting('attendanceGrace', '15'),
      emailLeaveRequests: this.getSetting('emailLeaveRequests', 'true') === 'true',
      emailPayroll: this.getSetting('emailPayroll', 'true') === 'true',
      emailAttendance: this.getSetting('emailAttendance', 'false') === 'true',
      smtpEnabled: this.getSetting('smtpEnabled', 'false') === 'true',
      smtpHost: this.getSetting('smtpHost', ''),
      smtpPort: this.getSetting('smtpPort', '587'),
      smtpUser: this.getSetting('smtpUser', ''),
      smtpPassword: this.getSetting('smtpPassword', ''),
      smtpFrom: this.getSetting('smtpFrom', ''),
      sessionTimeoutMinutes: this.getSetting('sessionTimeoutMinutes', '30'),
      currency: this.getSetting('currency', 'USD'),
      leaveAnnualDays: this.getSetting('leaveAnnualDays', '15'),
      leaveUndergroundDays: this.getSetting('leaveUndergroundDays', '21'),
      leaveSickDays: this.getSetting('leaveSickDays', '12'),
      leavePaternityDays: this.getSetting('leavePaternityDays', '5'),
      leaveMaternityDays: this.getSetting('leaveMaternityDays', '84'),
      leaveSeniorityYears: this.getSetting('leaveSeniorityYears', '5'),
      leaveSeniorityBonusDays: this.getSetting('leaveSeniorityBonusDays', '3'),
      leaveSickMedicalCertDays: this.getSetting('leaveSickMedicalCertDays', '2'),
    };
  }

  private leavePolicy(): ReturnType<typeof policyFromSettings> {
    return policyFromSettings(this.getSettings() as unknown as Record<string, string>);
  }

  getEmployeeLeaveProfileByName(employeeName: string): ReturnType<typeof employeeLeaveProfileFromRow> | null {
    const row = this.db
      .prepare('SELECT * FROM employees WHERE name = ?')
      .get(employeeName) as Record<string, unknown> | undefined;
    return row ? employeeLeaveProfileFromRow(row) : null;
  }

  recalculateEmployeeLeaveEntitlements(employeeId: string): void {
    const row = this.db
      .prepare('SELECT * FROM employees WHERE id = ?')
      .get(employeeId) as Record<string, unknown> | undefined;
    if (!row) return;

    const profile = employeeLeaveProfileFromRow(row);
    const entitlements = calculateEmployeeEntitlements(profile, this.leavePolicy());
    const existing = this.db
      .prepare('SELECT annual_used, sick_used, maternity_used, paternity_used FROM leave_balances WHERE employee_id = ?')
      .get(employeeId) as
      | { annual_used: number; sick_used: number; maternity_used: number; paternity_used: number }
      | undefined;

    this.db
      .prepare(sqlUpsertLeaveBalance(this.db.engine))
      .run(
        employeeId,
        entitlements.annualEntitlement,
        entitlements.sickEntitlement,
        existing?.annual_used ?? 0,
        existing?.sick_used ?? 0,
        entitlements.maternityEntitlement,
        existing?.maternity_used ?? 0,
        entitlements.paternityEntitlement,
        existing?.paternity_used ?? 0,
      );
  }

  recalculateAllLeaveEntitlements(): void {
    const employees = this.db.prepare('SELECT id FROM employees').all() as { id: string }[];
    for (const emp of employees) this.recalculateEmployeeLeaveEntitlements(emp.id);
  }

  validateLeaveForEmployee(
    employeeName: string,
    input: { type: string; days: number; medicalCertificateProvided?: boolean },
    forApproval = false,
  ): { ok: true } | { ok: false; error: string } {
    const profile = this.getEmployeeLeaveProfileByName(employeeName);
    if (!profile) return { ok: false, error: 'Employee not found.' };

    const balanceRow = this.db
      .prepare('SELECT * FROM leave_balances WHERE employee_id = ?')
      .get(profile.id) as Record<string, unknown> | undefined;

    const entitlements = calculateEmployeeEntitlements(profile, this.leavePolicy());
    const balances = {
      ...entitlements,
      annualUsed: (balanceRow?.annual_used as number) ?? 0,
      sickUsed: (balanceRow?.sick_used as number) ?? 0,
      maternityUsed: (balanceRow?.maternity_used as number) ?? 0,
      paternityUsed: (balanceRow?.paternity_used as number) ?? 0,
    };

    return validateLeaveRequest(
      profile,
      {
        employee: employeeName,
        type: input.type,
        days: input.days,
        medicalCertificateProvided: input.medicalCertificateProvided,
        forApproval,
      },
      balances,
      this.leavePolicy(),
    );
  }

  updateSettings(input: Partial<HrSettings>): HrSettings {
    const current = this.getSettings();
    const merged = { ...current, ...input };
    for (const [key, val] of Object.entries(merged)) {
      if (typeof val === 'boolean') this.setSetting(key, val ? 'true' : 'false');
      else this.setSetting(key, String(val));
    }
    if (input.currency?.trim()) {
      this.setSetting('currency', input.currency.trim());
    }
    const leaveKeys = [
      'leaveAnnualDays',
      'leaveUndergroundDays',
      'leaveSickDays',
      'leavePaternityDays',
      'leaveMaternityDays',
      'leaveSeniorityYears',
      'leaveSeniorityBonusDays',
      'leaveSickMedicalCertDays',
    ];
    if (leaveKeys.some((key) => key in input)) {
      this.recalculateAllLeaveEntitlements();
    }
    this.log('update', 'settings', 'hr', 'HR settings updated');
    return this.getSettings();
  }

  getLeaveBalances(): LeaveBalance[] {
    const rows = this.db
      .prepare(
        `SELECT lb.*, e.name as employee_name, e.gender, e.employment_type, e.work_hours_ratio,
                e.underground_mining, e.join_date, e.probation_end_date, e.status
         FROM leave_balances lb
         JOIN employees e ON e.id = lb.employee_id ORDER BY e.name`,
      )
      .all() as Record<string, unknown>[];
    return rows.map((r) => {
      const profile = employeeLeaveProfileFromRow({
        id: r.employee_id,
        name: r.employee_name,
        gender: r.gender,
        employment_type: r.employment_type,
        work_hours_ratio: r.work_hours_ratio,
        underground_mining: r.underground_mining,
        join_date: r.join_date,
        probation_end_date: r.probation_end_date,
        status: r.status,
      });
      const take = canEmployeeTakeLeave(profile);
      return {
        employeeId: r.employee_id as string,
        employeeName: r.employee_name as string,
        annualEntitlement: r.annual_entitlement as number,
        sickEntitlement: r.sick_entitlement as number,
        annualUsed: r.annual_used as number,
        sickUsed: r.sick_used as number,
        annualRemaining: (r.annual_entitlement as number) - (r.annual_used as number),
        sickRemaining: (r.sick_entitlement as number) - (r.sick_used as number),
        maternityEntitlement: (r.maternity_entitlement as number) ?? 0,
        maternityUsed: (r.maternity_used as number) ?? 0,
        maternityRemaining: ((r.maternity_entitlement as number) ?? 0) - ((r.maternity_used as number) ?? 0),
        paternityEntitlement: (r.paternity_entitlement as number) ?? 0,
        paternityUsed: (r.paternity_used as number) ?? 0,
        paternityRemaining: ((r.paternity_entitlement as number) ?? 0) - ((r.paternity_used as number) ?? 0),
        onProbation: !take.ok,
        canTakeLeave: take.ok,
      };
    });
  }

  updateLeaveBalance(input: UpdateLeaveBalanceInput): LeaveBalance | null {
    if (!input.adjustmentReason?.trim()) {
      throw new Error('A reason is required when manually adjusting leave balance.');
    }

    const emp = this.db
      .prepare('SELECT id, name FROM employees WHERE id = ?')
      .get(input.employeeId) as { id: string; name: string } | undefined;
    if (!emp) return null;

    const existing = this.db
      .prepare('SELECT * FROM leave_balances WHERE employee_id = ?')
      .get(input.employeeId) as Record<string, unknown> | undefined;

    const before = {
      annualEntitlement: (existing?.annual_entitlement as number) ?? 0,
      sickEntitlement: (existing?.sick_entitlement as number) ?? 0,
      annualUsed: (existing?.annual_used as number) ?? 0,
      sickUsed: (existing?.sick_used as number) ?? 0,
      maternityEntitlement: (existing?.maternity_entitlement as number) ?? 0,
      maternityUsed: (existing?.maternity_used as number) ?? 0,
      paternityEntitlement: (existing?.paternity_entitlement as number) ?? 0,
      paternityUsed: (existing?.paternity_used as number) ?? 0,
    };

    const after = {
      annualEntitlement: input.annualEntitlement,
      sickEntitlement: input.sickEntitlement,
      annualUsed: input.annualUsed ?? before.annualUsed,
      sickUsed: input.sickUsed ?? before.sickUsed,
      maternityEntitlement: input.maternityEntitlement ?? before.maternityEntitlement,
      maternityUsed: input.maternityUsed ?? before.maternityUsed,
      paternityEntitlement: input.paternityEntitlement ?? before.paternityEntitlement,
      paternityUsed: input.paternityUsed ?? before.paternityUsed,
    };

    this.db
      .prepare(sqlUpsertLeaveBalance(this.db.engine))
      .run(
        input.employeeId,
        after.annualEntitlement,
        after.sickEntitlement,
        after.annualUsed,
        after.sickUsed,
        after.maternityEntitlement,
        after.maternityUsed,
        after.paternityEntitlement,
        after.paternityUsed,
      );

    const changes: string[] = [];
    const fields: Array<[string, string]> = [
      ['annualEntitlement', 'Annual entitlement'],
      ['sickEntitlement', 'Sick entitlement'],
      ['annualUsed', 'Annual used'],
      ['sickUsed', 'Sick used'],
      ['maternityEntitlement', 'Maternity entitlement'],
      ['maternityUsed', 'Maternity used'],
      ['paternityEntitlement', 'Paternity entitlement'],
      ['paternityUsed', 'Paternity used'],
    ];
    for (const [key, label] of fields) {
      const prev = before[key as keyof typeof before];
      const next = after[key as keyof typeof after];
      if (prev !== next) changes.push(`${label}: ${prev} → ${next}`);
    }

    const details = `Manual leave adjustment for ${emp.name}. Reason: ${input.adjustmentReason.trim()}. Changes: ${changes.join('; ') || 'no field changes'}`;
    this.log('adjust', 'leave_balance', input.employeeId, details);

    return this.getLeaveBalances().find((b) => b.employeeId === input.employeeId) ?? null;
  }

  getHolidays(): Holiday[] {
    const rows = this.db.prepare('SELECT * FROM holidays ORDER BY date').all() as Record<string, unknown>[];
    return rows.map((r) => ({
      id: r.id as string,
      name: r.name as string,
      date: r.date as string,
      recurring: Boolean(r.recurring),
    }));
  }

  createHoliday(input: CreateHolidayInput): Holiday {
    const id = `HOL-${Date.now().toString(36).toUpperCase()}`;
    this.db
      .prepare('INSERT INTO holidays (id, name, date, recurring) VALUES (?, ?, ?, ?)')
      .run(id, input.name, input.date, input.recurring ? 1 : 0);
    this.log('create', 'holiday', id, input.name);
    return { id, name: input.name, date: input.date, recurring: input.recurring };
  }

  deleteHoliday(id: string): boolean {
    const result = this.db.prepare('DELETE FROM holidays WHERE id = ?').run(id);
    if (result.changes > 0) this.log('delete', 'holiday', id, 'Holiday removed');
    return result.changes > 0;
  }

  getEmployeeNotes(employeeId: string): EmployeeNote[] {
    const rows = this.db
      .prepare('SELECT * FROM employee_notes WHERE employee_id = ? ORDER BY created_at DESC')
      .all(employeeId) as Record<string, unknown>[];
    return rows.map((r) => ({
      id: r.id as string,
      employeeId: r.employee_id as string,
      note: r.note as string,
      createdAt: r.created_at as string,
      createdBy: r.created_by as string,
    }));
  }

  createEmployeeNote(input: CreateEmployeeNoteInput): EmployeeNote {
    const id = `NOTE-${Date.now().toString(36).toUpperCase()}`;
    const createdAt = new Date().toISOString();
    this.db
      .prepare(
        'INSERT INTO employee_notes (id, employee_id, note, created_at, created_by) VALUES (?, ?, ?, ?, ?)',
      )
      .run(id, input.employeeId, input.note, createdAt, this.auditCtx.userName);
    this.log('create', 'employee_note', id, `Note on employee ${input.employeeId}`);
    return {
      id,
      employeeId: input.employeeId,
      note: input.note,
      createdAt,
      createdBy: this.auditCtx.userName,
    };
  }

  deleteEmployeeNote(id: string): boolean {
    const result = this.db.prepare('DELETE FROM employee_notes WHERE id = ?').run(id);
    return result.changes > 0;
  }

  getEmployeeDocuments(employeeId: string): EmployeeDocument[] {
    const rows = this.db
      .prepare('SELECT id, employee_id, name, file_name, uploaded_at FROM employee_documents WHERE employee_id = ? ORDER BY uploaded_at DESC')
      .all(employeeId) as Record<string, unknown>[];
    return rows.map((r) => ({
      id: r.id as string,
      employeeId: r.employee_id as string,
      name: r.name as string,
      fileName: r.file_name as string,
      uploadedAt: r.uploaded_at as string,
    }));
  }

  addEmployeeDocument(input: CreateDocumentInput): EmployeeDocument {
    const id = `DOC-${Date.now().toString(36).toUpperCase()}`;
    const uploadedAt = new Date().toISOString();
    this.db
      .prepare(
        'INSERT INTO employee_documents (id, employee_id, name, file_name, file_data, uploaded_at) VALUES (?, ?, ?, ?, ?, ?)',
      )
      .run(id, input.employeeId, input.name, input.fileName, input.fileData, uploadedAt);
    this.log('create', 'document', id, input.name);
    return {
      id,
      employeeId: input.employeeId,
      name: input.name,
      fileName: input.fileName,
      uploadedAt,
    };
  }

  getEmployeeDocumentData(id: string): { fileName: string; fileData: string } | null {
    const row = this.db
      .prepare('SELECT file_name, file_data FROM employee_documents WHERE id = ?')
      .get(id) as { file_name: string; file_data: string } | undefined;
    if (!row) return null;
    return { fileName: row.file_name, fileData: row.file_data };
  }

  deleteEmployeeDocument(id: string): boolean {
    const result = this.db.prepare('DELETE FROM employee_documents WHERE id = ?').run(id);
    return result.changes > 0;
  }

  getAuditLog(limit = 100): AuditLogEntry[] {
    const rows = this.db
      .prepare('SELECT * FROM audit_log ORDER BY timestamp DESC LIMIT ?')
      .all(limit) as Record<string, unknown>[];
    return rows.map((r) => ({
      id: r.id as string,
      action: r.action as string,
      entity: r.entity as string,
      entityId: r.entity_id as string,
      details: r.details as string,
      userName: r.user_name as string,
      timestamp: r.timestamp as string,
    }));
  }

  deleteAllAuditLog(): number {
    const result = this.db.prepare('DELETE FROM audit_log').run();
    return result.changes;
  }

  getNotifications(): HrNotification[] {
    const rows = this.db
      .prepare('SELECT * FROM hr_notifications ORDER BY created_at DESC LIMIT 50')
      .all() as Record<string, unknown>[];
    return rows.map((r) => ({
      id: r.id as string,
      type: r.type as string,
      title: r.title as string,
      message: r.message as string,
      read: Boolean(r.read),
      createdAt: r.created_at as string,
      linkPage: r.link_page as string | undefined,
    }));
  }

  markNotificationRead(id: string): boolean {
    const result = this.db.prepare('UPDATE hr_notifications SET read = 1 WHERE id = ?').run(id);
    return result.changes > 0;
  }

  markAllNotificationsRead(): boolean {
    this.db.prepare('UPDATE hr_notifications SET read = 1 WHERE read = 0').run();
    return true;
  }

  getMessageTemplates(): MessageTemplate[] {
    const rows = this.db.prepare('SELECT * FROM message_templates ORDER BY name').all() as Record<string, unknown>[];
    return rows.map((r) => ({
      id: r.id as string,
      name: r.name as string,
      type: r.type as string,
      subject: r.subject as string,
      body: r.body as string,
    }));
  }

  createMessageTemplate(input: CreateMessageTemplateInput): MessageTemplate {
    const id = `TPL-${Date.now().toString(36).toUpperCase()}`;
    this.db
      .prepare('INSERT INTO message_templates (id, name, type, subject, body) VALUES (?, ?, ?, ?, ?)')
      .run(id, input.name, input.type, input.subject, input.body);
    return { id, ...input };
  }

  deleteMessageTemplate(id: string): boolean {
    const result = this.db.prepare('DELETE FROM message_templates WHERE id = ?').run(id);
    return result.changes > 0;
  }

  getAttendanceTrends(): AttendanceTrend[] {
    const rows = this.db
      .prepare(sqlAttendanceSinceDaysAgo(this.db.engine, 42))
      .all() as { date: string; status: string; hours: number }[];

    const weeks: Record<string, { present: number; total: number; hours: number }> = {};
    for (const row of rows) {
      const d = new Date(row.date);
      const weekStart = new Date(d);
      weekStart.setDate(d.getDate() - d.getDay());
      const key = weekStart.toISOString().slice(0, 10);
      if (!weeks[key]) weeks[key] = { present: 0, total: 0, hours: 0 };
      weeks[key].total += 1;
      if (row.status === 'Present') weeks[key].present += 1;
      weeks[key].hours += row.hours;
    }

    return Object.entries(weeks)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6)
      .map(([week, data]) => ({
        week,
        presentRate: data.total > 0 ? Math.round((data.present / data.total) * 100) : 0,
        totalHours: Math.round(data.hours),
      }));
  }

  getDepartmentCostReport(): DepartmentCostReport[] {
    const depts = this.db.prepare('SELECT * FROM departments ORDER BY name').all() as Record<string, unknown>[];
    const period = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
    const prefix = `PAY-${period}-`;

    return depts.map((d) => {
      const name = d.name as string;
      const salaryRow = this.db
        .prepare('SELECT SUM(salary) as total FROM employees WHERE department = ? AND status != ?')
        .get(name, 'Terminated') as { total: number };
      const payrollRow = this.db
        .prepare('SELECT SUM(net_pay) as total FROM payroll WHERE department = ? AND id LIKE ?')
        .get(name, `${prefix}%`) as { total: number };
      return {
        department: name,
        employeeCount: d.employees as number,
        totalSalary: salaryRow.total ?? 0,
        budget: d.budget as number,
        payrollThisMonth: payrollRow.total ?? 0,
      };
    });
  }

  getCelebrations(): Celebration[] {
    const today = new Date();
    const employees = this.db
      .prepare('SELECT id, name, join_date, birth_date FROM employees WHERE status != ?')
      .all('Terminated') as { id: string; name: string; join_date: string; birth_date: string | null }[];

    const celebrations: Celebration[] = [];
    for (const emp of employees) {
      if (emp.birth_date) {
        const bd = new Date(emp.birth_date);
        if (bd.getMonth() === today.getMonth() && bd.getDate() === today.getDate()) {
          celebrations.push({
            employeeId: emp.id,
            employeeName: emp.name,
            type: 'birthday',
            date: emp.birth_date,
          });
        }
      }
      const jd = new Date(emp.join_date);
      if (jd.getMonth() === today.getMonth() && jd.getDate() === today.getDate()) {
        const years = today.getFullYear() - jd.getFullYear();
        if (years > 0) {
          celebrations.push({
            employeeId: emp.id,
            employeeName: emp.name,
            type: 'anniversary',
            date: emp.join_date,
            years,
          });
        }
      }
    }
    return celebrations;
  }

  getAccountingSyncStatus(): AccountingSyncStatus[] {
    const rows = this.db
      .prepare('SELECT id, employee, net_pay, status, transaction_id, processed_date FROM payroll ORDER BY id DESC LIMIT 50')
      .all() as Record<string, unknown>[];
    return rows.map((r) => ({
      payrollId: r.id as string,
      employee: r.employee as string,
      amount: r.net_pay as number,
      status: r.status as string,
      transactionId: r.transaction_id as string | undefined,
      processedDate: r.processed_date as string | undefined,
    }));
  }

  terminateEmployee(input: TerminateEmployeeInput): boolean {
    const emp = this.db
      .prepare('SELECT name FROM employees WHERE id = ?')
      .get(input.employeeId) as { name: string } | undefined;
    if (!emp) return false;

    const leaveRows = this.db
      .prepare('SELECT * FROM leave_requests WHERE employee = ? AND status = ?')
      .all(emp.name, 'Approved') as Record<string, unknown>[];
    const activeLeave = leaveRows.map((row) => this.mapLeaveRow(row));
    if (isEmployeeOnMaternityLeave(emp.name, activeLeave)) {
      throw new Error('Cannot terminate an employee who is currently on approved maternity leave.');
    }

    const endDate = input.endDate ?? new Date().toISOString().slice(0, 10);
    this.db
      .prepare(
        'UPDATE employees SET status = ?, end_date = ?, termination_reason = ? WHERE id = ?',
      )
      .run('Terminated', endDate, input.reason, input.employeeId);
    this.log('terminate', 'employee', input.employeeId, `${emp.name}: ${input.reason}`);
    this.notify('employee', 'Employee Terminated', `${emp.name} has been terminated.`, 'employees');
    return true;
  }

  approveLeaveManager(id: string): LeaveRequest | null {
    const row = this.db
      .prepare('SELECT * FROM leave_requests WHERE id = ?')
      .get(id) as Record<string, unknown> | undefined;
    if (!row || row.status !== 'Pending') return null;

    this.db
      .prepare('UPDATE leave_requests SET manager_approved = 1, approval_stage = ? WHERE id = ?')
      .run('Pending HR', id);
    this.log('approve', 'leave', id, `Manager approved leave for ${row.employee}`);
    this.notify('leave', 'Leave Pending HR Approval', `${row.employee} leave needs HR approval.`, 'leave');

    return this.mapLeaveRow({ ...row, manager_approved: 1, approval_stage: 'Pending HR' });
  }

  approveLeaveHr(id: string): LeaveRequest | null {
    const row = this.db
      .prepare('SELECT * FROM leave_requests WHERE id = ?')
      .get(id) as Record<string, unknown> | undefined;
    if (!row || row.status !== 'Pending') return null;

    const validation = this.validateLeaveForEmployee(
      row.employee as string,
      {
        type: row.type as string,
        days: row.days as number,
        medicalCertificateProvided: Boolean(row.medical_certificate_provided),
      },
      true,
    );
    if (!validation.ok) throw new Error(validation.error);

    this.db
      .prepare('UPDATE leave_requests SET status = ?, approval_stage = ? WHERE id = ?')
      .run('Approved', 'Approved', id);

    this.db
      .prepare('UPDATE employees SET status = ? WHERE name = ?')
      .run('On Leave', row.employee as string);

    this.deductLeaveBalance(row.employee as string, row.type as string, row.days as number);
    this.createLeaveAttendanceRows(row);

    this.log('approve', 'leave', id, `HR approved leave for ${row.employee}`);
    this.notify('leave', 'Leave Approved', `${row.employee} leave approved.`, 'leave');

    if (this.getSettings().emailLeaveRequests) {
      this.notify('email', 'Leave Email Queued', `Leave approval email for ${row.employee}`, 'messages');
    }

    return this.mapLeaveRow({ ...row, status: 'Approved', approval_stage: 'Approved' });
  }

  private deductLeaveBalance(employeeName: string, leaveType: string, days: number): void {
    const emp = this.db
      .prepare('SELECT id FROM employees WHERE name = ?')
      .get(employeeName) as { id: string } | undefined;
    if (!emp) return;

    const category = classifyLeaveType(leaveType);
    const column =
      category === 'sick'
        ? 'sick_used'
        : category === 'maternity'
          ? 'maternity_used'
          : category === 'paternity'
            ? 'paternity_used'
            : 'annual_used';

    this.db
      .prepare(`UPDATE leave_balances SET ${column} = ${column} + ? WHERE employee_id = ?`)
      .run(days, emp.id);
  }

  private createLeaveAttendanceRows(row: Record<string, unknown>): void {
    const start = new Date(row.start_date as string);
    const end = new Date(row.end_date as string);
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().slice(0, 10);
      const exists = this.db
        .prepare('SELECT id FROM attendance WHERE employee = ? AND date = ?')
        .get(row.employee as string, dateStr) as { id: string } | undefined;
      if (exists) continue;
      const id = `ATT-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      this.db
        .prepare(
          'INSERT INTO attendance (id, employee, date, check_in, check_out, hours, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
        )
        .run(id, row.employee, dateStr, '—', '—', 0, 'On Leave');
    }
  }

  syncLeaveStatuses(): number {
    const today = new Date().toISOString().slice(0, 10);
    const approved = this.db
      .prepare('SELECT * FROM leave_requests WHERE status = ? AND end_date < ?')
      .all('Approved', today) as Record<string, unknown>[];

    let updated = 0;
    for (const row of approved) {
      const activeLeave = this.db
        .prepare(
          'SELECT COUNT(*) as count FROM leave_requests WHERE employee = ? AND status = ? AND start_date <= ? AND end_date >= ?',
        )
        .get(row.employee, 'Approved', today, today) as { count: number };
      if (activeLeave.count === 0) {
        this.db
          .prepare('UPDATE employees SET status = ? WHERE name = ? AND status = ?')
          .run('Active', row.employee as string, 'On Leave');
        updated += 1;
      }
    }

    const rejected = this.db
      .prepare('SELECT employee FROM leave_requests WHERE status = ?')
      .all('Rejected') as { employee: string }[];
    for (const r of rejected) {
      this.db
        .prepare('UPDATE employees SET status = ? WHERE name = ? AND status = ?')
        .run('Active', r.employee, 'On Leave');
    }

    return updated;
  }

  rejectLeaveWithRestore(id: string): LeaveRequest | null {
    const row = this.db
      .prepare('SELECT * FROM leave_requests WHERE id = ?')
      .get(id) as Record<string, unknown> | undefined;
    if (!row) return null;

    this.db
      .prepare('UPDATE leave_requests SET status = ?, approval_stage = ? WHERE id = ?')
      .run('Rejected', 'Rejected', id);
    this.db
      .prepare('UPDATE employees SET status = ? WHERE name = ? AND status = ?')
      .run('Active', row.employee as string, 'On Leave');
    this.log('reject', 'leave', id, `Rejected leave for ${row.employee}`);

    return this.mapLeaveRow({ ...row, status: 'Rejected', approval_stage: 'Rejected' });
  }

  cancelLeaveRequest(id: string): LeaveRequest | null {
    const row = this.db
      .prepare('SELECT * FROM leave_requests WHERE id = ?')
      .get(id) as Record<string, unknown> | undefined;
    if (!row) return null;

    const status = row.status as string;
    if (status === 'Rejected' || status === 'Cancelled') return null;

    const employee = row.employee as string;

    if (status === 'Approved') {
      this.restoreLeaveBalance(employee, row.type as string, row.days as number);
      this.removeLeaveAttendanceRows(row);

      const today = this.localToday();
      const otherApproved = this.db
        .prepare(
          `SELECT id FROM leave_requests
           WHERE employee = ? AND status = 'Approved' AND id != ?
           AND start_date <= ? AND end_date >= ?`,
        )
        .get(employee, id, today, today) as { id: string } | undefined;
      if (!otherApproved) {
        this.db
          .prepare('UPDATE employees SET status = ? WHERE name = ? AND status = ?')
          .run('Active', employee, 'On Leave');
      }
    }

    this.db
      .prepare('UPDATE leave_requests SET status = ?, approval_stage = ? WHERE id = ?')
      .run('Cancelled', 'Cancelled', id);

    this.log('cancel', 'leave', id, `Cancelled leave for ${employee}`);
    this.notify('leave', 'Leave Cancelled', `${employee}'s leave request was cancelled.`, 'leave');

    return this.mapLeaveRow({ ...row, status: 'Cancelled', approval_stage: 'Cancelled' });
  }

  private restoreLeaveBalance(employeeName: string, leaveType: string, days: number): void {
    const emp = this.db
      .prepare('SELECT id FROM employees WHERE name = ?')
      .get(employeeName) as { id: string } | undefined;
    if (!emp) return;

    const category = classifyLeaveType(leaveType);
    const column =
      category === 'sick'
        ? 'sick_used'
        : category === 'maternity'
          ? 'maternity_used'
          : category === 'paternity'
            ? 'paternity_used'
            : 'annual_used';

    const balance = this.db
      .prepare(`SELECT ${column} FROM leave_balances WHERE employee_id = ?`)
      .get(emp.id) as Record<string, number> | undefined;
    if (!balance) return;

    const current = Number(balance[column] ?? 0);
    const next = Math.max(0, current - days);
    this.db
      .prepare(`UPDATE leave_balances SET ${column} = ? WHERE employee_id = ?`)
      .run(next, emp.id);
  }

  private removeLeaveAttendanceRows(row: Record<string, unknown>): void {
    const start = new Date(`${row.start_date as string}T12:00:00`);
    const end = new Date(`${row.end_date as string}T12:00:00`);
    const employee = row.employee as string;
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().slice(0, 10);
      this.db
        .prepare('DELETE FROM attendance WHERE employee = ? AND date = ? AND status = ?')
        .run(employee, dateStr, 'On Leave');
    }
  }

  mapLeaveRow(row: Record<string, unknown>): LeaveRequest {
    return {
      id: row.id as string,
      employee: row.employee as string,
      type: row.type as string,
      startDate: row.start_date as string,
      endDate: row.end_date as string,
      days: row.days as number,
      status: row.status as string,
      reason: row.reason as string,
      approvalStage: (row.approval_stage as string) ?? 'Pending Manager',
      managerApproved: Boolean(row.manager_approved),
      medicalCertificateProvided: Boolean(row.medical_certificate_provided),
    };
  }

  calcLateMinutes(checkIn: string, graceMinutes: number): number {
    const match = checkIn.match(/^(\d{1,2}):(\d{2})/);
    if (!match) return 0;
    const hour = parseInt(match[1], 10);
    const min = parseInt(match[2], 10);
    const standardStart = 9;
    const late = (hour - standardStart) * 60 + min - graceMinutes;
    return Math.max(0, late);
  }

  calcOvertimeHours(hours: number, workHours: number): number {
    return Math.max(0, hours - workHours);
  }

  enrichAttendance(input: CreateAttendanceInput): CreateAttendanceInput & { lateMinutes: number; overtimeHours: number } {
    const settings = this.getSettings();
    const grace = parseInt(settings.attendanceGrace, 10) || 15;
    const workHours = parseFloat(settings.workHours) || 8;
    const lateMinutes = input.status === 'Present' ? this.calcLateMinutes(input.checkIn, grace) : 0;
    const overtimeHours = input.status === 'Present' ? this.calcOvertimeHours(input.hours, workHours) : 0;
    return { ...input, lateMinutes, overtimeHours };
  }

  private hasClockTime(value: unknown): boolean {
    const s = String(value ?? '').trim();
    return s.length > 0 && s !== '—' && s !== '-';
  }

  private localToday(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  private todayDateKeys(): string[] {
    const local = this.localToday();
    const utc = new Date().toISOString().slice(0, 10);
    return local === utc ? [local] : [local, utc];
  }

  private getTodayAttendanceRows(employeeName: string): Record<string, unknown>[] {
    const name = employeeName.trim();
    const dates = this.todayDateKeys();
    const placeholders = dates.map(() => '?').join(', ');
    return this.db
      .prepare(
        `SELECT * FROM attendance WHERE TRIM(employee) = ? AND date IN (${placeholders}) ORDER BY rowid DESC`,
      )
      .all(name, ...dates) as Record<string, unknown>[];
  }

  clockIn(employeeName: string): AttendanceRecord {
    const today = this.localToday();
    const now = new Date();
    const checkIn = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const rows = this.getTodayAttendanceRows(employeeName);

    if (rows.some((row) => this.hasClockTime(row.check_in))) {
      throw new Error(`${employeeName} has already clocked in.`);
    }

    const existing = rows.find((row) => !this.hasClockTime(row.check_in));

    if (existing) {
      const enriched = this.enrichAttendance({
        employee: employeeName,
        date: today,
        checkIn,
        checkOut: existing.check_out as string,
        hours: existing.hours as number,
        status: 'Present',
      });
      this.db
        .prepare(
          'UPDATE attendance SET check_in = ?, status = ?, late_minutes = ?, overtime_hours = ? WHERE id = ?',
        )
        .run(enriched.checkIn, enriched.status, enriched.lateMinutes, enriched.overtimeHours, existing.id);
      return this.mapAttendanceRow({ ...existing, check_in: checkIn, status: 'Present', late_minutes: enriched.lateMinutes, overtime_hours: enriched.overtimeHours });
    }

    const id = `ATT-${Date.now()}`;
    const enriched = this.enrichAttendance({
      employee: employeeName,
      date: today,
      checkIn,
      checkOut: '—',
      hours: 0,
      status: 'Present',
    });
    this.db
      .prepare(
        'INSERT INTO attendance (id, employee, date, check_in, check_out, hours, status, late_minutes, overtime_hours) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      )
      .run(id, employeeName, today, enriched.checkIn, enriched.checkOut, 0, enriched.status, enriched.lateMinutes, enriched.overtimeHours);
    this.log('clock_in', 'attendance', id, `${employeeName} clocked in at ${checkIn}`);
    return this.mapAttendanceRow({
      id,
      employee: employeeName,
      date: today,
      check_in: enriched.checkIn,
      check_out: enriched.checkOut,
      hours: 0,
      status: enriched.status,
      late_minutes: enriched.lateMinutes,
      overtime_hours: enriched.overtimeHours,
    });
  }

  clockOut(employeeName: string): AttendanceRecord {
    const today = this.localToday();
    const now = new Date();
    const checkOut = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const rows = this.getTodayAttendanceRows(employeeName);

    if (!rows.some((row) => this.hasClockTime(row.check_in))) {
      throw new Error(`${employeeName} has not clocked in yet.`);
    }

    const existing = rows.find(
      (row) => this.hasClockTime(row.check_in) && !this.hasClockTime(row.check_out),
    );
    if (!existing) {
      throw new Error(`${employeeName} has already clocked out.`);
    }

    const checkIn = existing.check_in as string;
    const [inH, inM] = checkIn.split(':').map(Number);
    const [outH, outM] = checkOut.split(':').map(Number);
    const hours = Math.max(0, (outH * 60 + outM - inH * 60 - inM) / 60);

    const enriched = this.enrichAttendance({
      employee: employeeName,
      date: today,
      checkIn,
      checkOut,
      hours: Math.round(hours * 10) / 10,
      status: 'Present',
    });

    this.db
      .prepare(
        'UPDATE attendance SET check_out = ?, hours = ?, late_minutes = ?, overtime_hours = ? WHERE id = ?',
      )
      .run(enriched.checkOut, enriched.hours, enriched.lateMinutes, enriched.overtimeHours, existing.id);
    this.log('clock_out', 'attendance', existing.id as string, `${employeeName} clocked out at ${checkOut}`);
    return this.mapAttendanceRow({
      ...existing,
      check_out: enriched.checkOut,
      hours: enriched.hours,
      late_minutes: enriched.lateMinutes,
      overtime_hours: enriched.overtimeHours,
    });
  }

  mapAttendanceRow(r: Record<string, unknown>): AttendanceRecord {
    return {
      id: r.id as string,
      employee: r.employee as string,
      date: r.date as string,
      checkIn: r.check_in as string,
      checkOut: r.check_out as string,
      hours: r.hours as number,
      status: r.status as string,
      lateMinutes: (r.late_minutes as number) ?? 0,
      overtimeHours: (r.overtime_hours as number) ?? 0,
    };
  }

  importAttendanceCsv(csvText: string): number {
    const lines = csvText.trim().split('\n').slice(1);
    let imported = 0;
    for (const line of lines) {
      const parts = line.split(',').map((s) => s.trim().replace(/^"|"$/g, ''));
      if (parts.length < 6) continue;
      const [employee, date, checkIn, checkOut, hours, status] = parts;
      const exists = this.db
        .prepare('SELECT id FROM attendance WHERE employee = ? AND date = ?')
        .get(employee, date) as { id: string } | undefined;
      if (exists) continue;
      const id = `ATT-IMP-${Date.now()}-${imported}`;
      const enriched = this.enrichAttendance({
        employee,
        date,
        checkIn,
        checkOut,
        hours: parseFloat(hours) || 0,
        status,
      });
      this.db
        .prepare(
          'INSERT INTO attendance (id, employee, date, check_in, check_out, hours, status, late_minutes, overtime_hours) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        )
        .run(
          id,
          enriched.employee,
          enriched.date,
          enriched.checkIn,
          enriched.checkOut,
          enriched.hours,
          enriched.status,
          enriched.lateMinutes,
          enriched.overtimeHours,
        );
      imported += 1;
    }
    if (imported > 0) {
      this.log('import', 'attendance', 'csv', `Imported ${imported} attendance records`);
      this.notify('attendance', 'Attendance Imported', `${imported} records imported from CSV.`, 'attendance');
    }
    return imported;
  }

  exportHrBackup(): string {
    const tables = [
      'employees',
      'departments',
      'job_positions',
      'payroll',
      'attendance',
      'leave_requests',
      'employee_messages',
      'hr_settings',
      'leave_balances',
      'holidays',
      'employee_notes',
      'employee_documents',
      'message_templates',
    ];
    const data: Record<string, unknown[]> = {};
    for (const table of tables) {
      try {
        data[table] = this.db.prepare(`SELECT * FROM ${table}`).all() as unknown[];
      } catch {
        data[table] = [];
      }
    }
    return JSON.stringify({ exportedAt: new Date().toISOString(), tables: data }, null, 2);
  }

  importHrBackup(jsonText: string): boolean {
    try {
      const parsed = JSON.parse(jsonText) as { tables: Record<string, Record<string, unknown>[]> };
      if (!parsed.tables) return false;
      this.db.beginBatch();
      for (const [table, rows] of Object.entries(parsed.tables)) {
        if (!rows.length) continue;
        const cols = Object.keys(rows[0]);
        const insert = this.db.prepare(
          sqlReplaceRow(this.db.engine, table, cols),
        );
        for (const row of rows) insert.run(...cols.map((c) => row[c]));
      }
      this.db.endBatch();
      this.log('import', 'backup', 'hr', 'HR backup restored');
      return true;
    } catch {
      return false;
    }
  }

  enhanceDashboardStats(base: HrDashboardStats): HrDashboardStats {
    const unread = this.db
      .prepare('SELECT COUNT(*) as count FROM hr_notifications WHERE read = 0')
      .get() as { count: number };
    return {
      ...base,
      attendanceTrends: this.getAttendanceTrends(),
      celebrations: this.getCelebrations(),
      unreadNotifications: unread.count,
    };
  }

  ensureLeaveBalanceForEmployee(employeeId: string): void {
    this.recalculateEmployeeLeaveEntitlements(employeeId);
  }

  private ensureCheckInSiteToken(): string {
    let token = this.getSetting('checkInSiteToken', '');
    if (!token) {
      token = `SITE-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
      this.setSetting('checkInSiteToken', token);
    }
    if (!this.getSetting('checkInSiteName', '')) {
      this.setSetting('checkInSiteName', 'Main Office');
    }
    return token;
  }

  private validateCheckInSiteToken(siteToken: string): boolean {
    const expected = this.ensureCheckInSiteToken();
    return siteToken.trim() === expected;
  }

  private logAttendanceScan(
    identifier: string,
    identifierType: 'phone' | 'email',
    outcome: string,
    details: string,
    employeeName?: string,
  ): void {
    const id = `SCAN-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const siteId = this.getSetting('checkInSiteName', 'Main Office');
    this.db
      .prepare(
        'INSERT INTO attendance_scan_log (id, identifier, identifier_type, site_id, outcome, employee_name, details, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      )
      .run(id, identifier, identifierType, siteId, outcome, employeeName ?? null, details, new Date().toISOString());
  }

  getKioskCheckInConfig(baseUrl: string): KioskCheckInConfig {
    const siteToken = this.ensureCheckInSiteToken();
    const siteName = this.getSetting('checkInSiteName', 'Main Office');
    const origin = baseUrl.replace(/\/$/, '');
    return {
      siteId: siteName,
      siteName,
      siteToken,
      checkInUrl: `${origin}/check-in?site=${encodeURIComponent(siteToken)}`,
    };
  }

  regenerateCheckInSiteToken(): void {
    const token = `SITE-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    this.setSetting('checkInSiteToken', token);
    this.log('update', 'check_in_kiosk', 'site', 'Office check-in QR token regenerated');
  }

  getAttendanceScanLog(limit = 50): AttendanceScanLogEntry[] {
    try {
      const rows = this.db
        .prepare('SELECT * FROM attendance_scan_log ORDER BY timestamp DESC LIMIT ?')
        .all(limit) as Record<string, unknown>[];
      return rows.map((r) => ({
        id: r.id as string,
        identifier: r.identifier as string,
        identifierType: r.identifier_type as 'phone' | 'email',
        siteId: r.site_id as string,
        outcome: r.outcome as string,
        employeeName: (r.employee_name as string) || undefined,
        details: r.details as string,
        timestamp: r.timestamp as string,
      }));
    } catch {
      return [];
    }
  }

  private resolveTodayClockAction(employeeName: string): 'check_in' | 'check_out' | 'completed' {
    const rows = this.getTodayAttendanceRows(employeeName);
    if (rows.some((row) => this.hasClockTime(row.check_in) && !this.hasClockTime(row.check_out))) {
      return 'check_out';
    }
    if (rows.some((row) => this.hasClockTime(row.check_in) && this.hasClockTime(row.check_out))) {
      return 'completed';
    }
    return 'check_in';
  }

  lookupCheckIn(input: CheckInLookupInput): CheckInLookupResult {
    if (!this.validateCheckInSiteToken(input.siteToken)) {
      return { ok: false, error: 'Invalid check-in link. Scan the QR code at your office.' };
    }

    const phone = input.phone?.trim();
    const email = input.email?.trim();
    if (!phone && !email) {
      return { ok: false, error: 'Enter your phone number or email.' };
    }

    const identifierType: 'phone' | 'email' = phone ? 'phone' : 'email';
    const identifier = phone ?? email ?? '';

    const employees = this.db.prepare('SELECT * FROM employees').all() as Record<string, unknown>[];
    const row = phone
      ? matchEmployeeByPhone(employees, phone)
      : matchEmployeeByEmail(employees, email!);

    if (!row) {
      this.logAttendanceScan(identifier, identifierType, 'not_found', 'No matching employee record', undefined);
      return {
        ok: false,
        error: 'We could not find you in STRATERA. Contact HR to be added as an employee.',
      };
    }

    const name = row.name as string;
    const status = row.status as string;

    if (status === 'Terminated') {
      this.logAttendanceScan(identifier, identifierType, 'terminated', 'Employment not active', name);
      return { ok: false, error: 'Your employment record is not active. Contact HR.' };
    }

    if (status === 'On Leave') {
      this.logAttendanceScan(identifier, identifierType, 'on_leave', 'Employee is on approved leave', name);
      return { ok: false, error: 'You are marked as on leave today. Contact HR if this is wrong.' };
    }

    const action = this.resolveTodayClockAction(name);
    if (action === 'completed') {
      return {
        ok: false,
        error: 'You have already checked in and out today.',
      };
    }

    return {
      ok: true,
      employee: {
        id: row.id as string,
        name,
        department: row.department as string,
      },
      action,
      message:
        action === 'check_in'
          ? `Ready to check in for today.`
          : `You are checked in. Ready to check out.`,
    };
  }

  confirmCheckIn(input: CheckInConfirmInput): CheckInConfirmResult {
    if (!this.validateCheckInSiteToken(input.siteToken)) {
      return { ok: false, error: 'Invalid check-in link. Scan the QR code at your office.' };
    }

    const row = this.db
      .prepare('SELECT * FROM employees WHERE id = ?')
      .get(input.employeeId) as Record<string, unknown> | undefined;
    if (!row) {
      return { ok: false, error: 'Employee not found.' };
    }

    const name = row.name as string;
    const status = row.status as string;
    if (status === 'Terminated') {
      return { ok: false, error: 'Your employment record is not active.' };
    }
    if (status === 'On Leave') {
      return { ok: false, error: 'You are marked as on leave today.' };
    }

    const expectedAction = this.resolveTodayClockAction(name);
    if (input.action === 'check_in' && expectedAction !== 'check_in') {
      return { ok: false, error: expectedAction === 'completed' ? 'You already finished attendance today.' : 'Please check out instead.' };
    }
    if (input.action === 'check_out' && expectedAction !== 'check_out') {
      return { ok: false, error: expectedAction === 'completed' ? 'You already checked out today.' : 'Please check in first.' };
    }

    try {
      const record =
        input.action === 'check_in' ? this.clockIn(name) : this.clockOut(name);
      const outcome = input.action === 'check_in' ? 'clock_in' : 'clock_out';
      this.logAttendanceScan(
        input.employeeId,
        'phone',
        outcome,
        `${name} ${input.action === 'check_in' ? 'checked in' : 'checked out'} via kiosk`,
        name,
      );
      return {
        ok: true,
        action: input.action,
        employeeName: name,
        time: input.action === 'check_in' ? record.checkIn : record.checkOut,
        message:
          input.action === 'check_in'
            ? `Checked in at ${record.checkIn}. Have a great day, ${name.split(' ')[0]}!`
            : `Checked out at ${record.checkOut}. See you tomorrow, ${name.split(' ')[0]}!`,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not record attendance.';
      this.logAttendanceScan(input.employeeId, 'phone', 'error', msg, name);
      return { ok: false, error: msg };
    }
  }
}
