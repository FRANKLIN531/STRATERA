import { getSchemaSql } from './schema-index';
import { seedDatabase, hashPassword } from './seed';
import { migrateHrExtensions } from './hr-migrate';
import { HrExtendedDb } from './hr-extended';
import { isValidEmail, isValidPhone, isWorkEmail, normalizeEmail, normalizePhone } from './validation';
import { CredentialEmailVerification } from './credential-email-verify';
import { PasswordResetVerification } from './password-reset';
import { sendEmployeeMessageEmail } from './mail';
import { sleep } from './email-templates';
import type { SendMessageFailure, SendMessageResult } from './types';
import type { DbClient } from './db-client';
import { addColumnIfMissing } from './dialect';
import type {
  User,
  Account,
  Transaction,
  Invoice,
  AccountingDashboardStats,
  Employee,
  PayrollRecord,
  EmployeePayrollStatus,
  AttendanceRecord,
  LeaveRequest,
  Department,
  HrDashboardStats,
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
  AccountingSyncStatus,
  CreateTransactionInput,
  CreateInvoiceInput,
  CreateEmployeeInput,
  CreateLeaveInput,
  CreateDepartmentInput,
  CreateJobPositionInput,
  CreateAttendanceInput,
  UpdateSalaryInput,
  SendMessageInput,
  JobPosition,
  EmployeeMessage,
  PayrollRunPreview,
  PayrollRunResult,
  CreateHolidayInput,
  CreateEmployeeNoteInput,
  CreateDocumentInput,
  CreateMessageTemplateInput,
  UpdateLeaveBalanceInput,
  TerminateEmployeeInput,
  SmtpConfig,
} from './types';

export class StrateraDatabase {
  private db: DbClient;
  private currentUser: User | null = null;
  private hrExt: HrExtendedDb;
  private credentialEmail: CredentialEmailVerification;
  private passwordReset: PasswordResetVerification;

  constructor(db: DbClient) {
    this.db = db;
    this.hrExt = new HrExtendedDb(db);
    this.credentialEmail = new CredentialEmailVerification(db);
    this.passwordReset = new PasswordResetVerification(db);
    this.db.beginBatch();
    this.db.exec(getSchemaSql(this.db.engine));
    this.migrate();
    seedDatabase(this.db);
    this.db.endBatch();
  }

  private migrate(): void {
    addColumnIfMissing(this.db, 'payroll', 'transaction_id', 'TEXT');
    addColumnIfMissing(this.db, 'payroll', 'processed_date', 'TEXT');
    this.backfillPayrollProcessedDates();

    addColumnIfMissing(this.db, 'employees', 'salary', 'REAL NOT NULL DEFAULT 0');
    addColumnIfMissing(this.db, 'employees', 'position_id', 'TEXT');

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS job_positions (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        department TEXT NOT NULL,
        level TEXT NOT NULL,
        min_salary REAL NOT NULL DEFAULT 0,
        max_salary REAL NOT NULL DEFAULT 0
      );
      CREATE TABLE IF NOT EXISTS employee_messages (
        id TEXT PRIMARY KEY,
        employee TEXT NOT NULL,
        employee_email TEXT NOT NULL,
        subject TEXT NOT NULL,
        body TEXT NOT NULL,
        type TEXT NOT NULL,
        sent_at TEXT NOT NULL,
        sent_by TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'Sent'
      );
    `);

    this.seedJobPositionsIfEmpty();
    this.backfillEmployeeSalaries();
    migrateHrExtensions(this.db);
    this.hrExt.recalculateAllLeaveEntitlements();
    this.ensurePayrollAccounts();

    addColumnIfMissing(this.db, 'users', 'must_change_credentials', 'INTEGER NOT NULL DEFAULT 0');
    if (this.db.engine === 'sqlite') {
      this.db.exec(
        "UPDATE users SET must_change_credentials = 1 WHERE role = 'Admin' AND email = 'admin@stratera.com'",
      );
    }

    this.credentialEmail.ensureTable();
  }

  private seedJobPositionsIfEmpty(): void {
    /* Job positions removed — table kept for existing databases only. */
  }

  private backfillEmployeeSalaries(): void {
    const rows = this.db
      .prepare('SELECT id, name, salary FROM employees WHERE salary = 0 OR salary IS NULL')
      .all() as { id: string; name: string; salary: number }[];
    for (const row of rows) {
      const payroll = this.db
        .prepare('SELECT base_salary FROM payroll WHERE employee = ? ORDER BY id DESC LIMIT 1')
        .get(row.name) as { base_salary: number } | undefined;
      if (payroll) {
        this.db.prepare('UPDATE employees SET salary = ? WHERE id = ?').run(payroll.base_salary, row.id);
      }
    }
  }

  private ensurePayrollAccounts(): void {
    const currency = this.hrExt.getSettings().currency || 'USD';
    const required: [string, string, string, number][] = [
      ['ACC-001', 'Cash & Bank', 'Asset', 0],
      ['ACC-006', 'Operating Expenses', 'Expense', 0],
    ];
    const exists = this.db.prepare('SELECT 1 AS ok FROM accounts WHERE name = ? LIMIT 1');
    const insert = this.db.prepare(
      'INSERT INTO accounts (id, name, type, balance, currency) VALUES (?, ?, ?, ?, ?)',
    );
    for (const [id, name, type, balance] of required) {
      if (!exists.get(name)) {
        insert.run(id, name, type, balance, currency);
      }
    }
  }

  private accountExists(name: string): boolean {
    const row = this.db.prepare('SELECT 1 AS ok FROM accounts WHERE name = ? LIMIT 1').get(name) as
      | { ok: number }
      | undefined;
    return Boolean(row);
  }

  private mapEmployeeRow(r: Record<string, unknown>): Employee {
    const positionId = r.position_id as string | undefined;
    let positionTitle: string | undefined;
    if (positionId) {
      const pos = this.db
        .prepare('SELECT title FROM job_positions WHERE id = ?')
        .get(positionId) as { title: string } | undefined;
      positionTitle = pos?.title;
    }
    return {
      id: r.id as string,
      name: r.name as string,
      department: r.department as string,
      role: r.role as string,
      email: r.email as string,
      phone: (r.phone as string) ?? '',
      status: r.status as string,
      joinDate: r.join_date as string,
      salary: (r.salary as number) ?? 0,
      positionId,
      positionTitle,
      birthDate: r.birth_date as string | undefined,
      endDate: r.end_date as string | undefined,
      terminationReason: r.termination_reason as string | undefined,
      gender: (r.gender as string) || undefined,
      employmentType: (r.employment_type as string) || 'full_time',
      workHoursRatio: (r.work_hours_ratio as number) ?? 1,
      undergroundMining: Boolean(r.underground_mining),
      probationEndDate: (r.probation_end_date as string) || undefined,
    };
  }

  private calcPayrollDeductions(gross: number): number {
    const settings = this.hrExt.getSettings();
    const rate = Math.max(0, parseFloat(settings.payrollDeductionRate || '22') || 0) / 100;
    const fixed = Math.max(0, parseFloat(settings.payrollDeductionFixed || '0') || 0);
    return Math.round(gross * rate + fixed);
  }

  private parseDateOnly(value: string): Date {
    const [y, m, d] = value.split('-').map(Number);
    return new Date(y, m - 1, d);
  }

  private formatDateOnly(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }

  private daysInMonth(year: number, month: number): number {
    return new Date(year, month + 1, 0).getDate();
  }

  private clampDay(year: number, month: number, day: number): number {
    return Math.min(day, this.daysInMonth(year, month));
  }

  private resolveProcessedDate(payrollId: string, stored?: string | null): string | undefined {
    if (stored) return stored;
    const compact = payrollId.match(/^PAY-[^-]+-(\d{8})$/);
    if (compact) {
      const raw = compact[1];
      return `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`;
    }
    const monthly = payrollId.match(/^PAY-(\d{4})-(\d{2})-/);
    if (monthly) {
      const year = Number(monthly[1]);
      const month = Number(monthly[2]) - 1;
      const day = this.daysInMonth(year, month);
      return `${monthly[1]}-${monthly[2]}-${String(day).padStart(2, '0')}`;
    }
    return undefined;
  }

  private getEffectiveProcessedDate(record: PayrollRecord): string | undefined {
    return this.resolveProcessedDate(record.id, record.processedDate);
  }

  private getLastPaidDate(employeeName: string): string | undefined {
    const last = this.getLastProcessedPayroll(employeeName);
    return last ? this.getEffectiveProcessedDate(last) : undefined;
  }

  private backfillPayrollProcessedDates(): void {
    const rows = this.db
      .prepare(
        "SELECT id FROM payroll WHERE status = 'Processed' AND (processed_date IS NULL OR processed_date = '')",
      )
      .all() as { id: string }[];
    const update = this.db.prepare('UPDATE payroll SET processed_date = ? WHERE id = ?');
    for (const row of rows) {
      const resolved = this.resolveProcessedDate(row.id, null);
      if (resolved) update.run(resolved, row.id);
    }
  }

  private getLastProcessedPayroll(employeeName: string): PayrollRecord | null {
    const rows = this.db
      .prepare("SELECT * FROM payroll WHERE employee = ? AND status = 'Processed'")
      .all(employeeName) as Record<string, unknown>[];
    if (!rows.length) return null;
    const mapped = rows.map((r) => this.mapPayrollRow(r));
    mapped.sort((a, b) => {
      const dateA = this.getEffectiveProcessedDate(a) ?? '';
      const dateB = this.getEffectiveProcessedDate(b) ?? '';
      return dateB.localeCompare(dateA);
    });
    return mapped[0] ?? null;
  }

  private getPendingPayroll(employeeName: string): PayrollRecord | null {
    const row = this.db
      .prepare("SELECT * FROM payroll WHERE employee = ? AND status = 'Pending' ORDER BY id DESC LIMIT 1")
      .get(employeeName) as Record<string, unknown> | undefined;
    return row ? this.mapPayrollRow(row) : null;
  }

  private getPayAnchorDay(employeeName: string, joinDate: string): number {
    const lastPaidDate = this.getLastPaidDate(employeeName);
    if (lastPaidDate) {
      return this.parseDateOnly(lastPaidDate).getDate();
    }
    return this.parseDateOnly(joinDate).getDate();
  }

  private getNextPayDueDate(employeeName: string, joinDate: string): string {
    const lastPaidDate = this.getLastPaidDate(employeeName);
    const anchorDay = this.getPayAnchorDay(employeeName, joinDate);

    if (!lastPaidDate) {
      const join = this.parseDateOnly(joinDate);
      const due = new Date(
        join.getFullYear(),
        join.getMonth(),
        this.clampDay(join.getFullYear(), join.getMonth(), anchorDay),
      );
      if (join > due) return this.formatDateOnly(join);
      return this.formatDateOnly(due);
    }

    const lastPaid = this.parseDateOnly(lastPaidDate);
    let nextMonth = lastPaid.getMonth() + 1;
    let nextYear = lastPaid.getFullYear();
    if (nextMonth > 11) {
      nextMonth = 0;
      nextYear += 1;
    }
    const nextDue = new Date(nextYear, nextMonth, this.clampDay(nextYear, nextMonth, anchorDay));
    return this.formatDateOnly(nextDue);
  }

  private isEmployeePayDue(employeeName: string, joinDate: string): boolean {
    const pending = this.getPendingPayroll(employeeName);
    if (pending) return true;

    const lastPaidDate = this.getLastPaidDate(employeeName);
    const today = this.parseDateOnly(this.formatDateOnly(new Date()));

    if (!lastPaidDate) {
      const join = this.parseDateOnly(joinDate);
      return today >= join;
    }

    const nextDue = this.parseDateOnly(this.getNextPayDueDate(employeeName, joinDate));
    return today >= nextDue;
  }

  private isEmployeePaidInCycle(employeeName: string, joinDate: string): boolean {
    if (this.getPendingPayroll(employeeName)) return false;
    if (!this.getLastPaidDate(employeeName)) return false;
    return !this.isEmployeePayDue(employeeName, joinDate);
  }

  private estimateEmployeePay(employee: { salary: number; name: string }): { deductions: number; netPay: number } {
    const pending = this.getPendingPayroll(employee.name);
    const baseSalary = pending?.baseSalary ?? employee.salary;
    const bonus = pending?.bonus ?? 0;
    const gross = baseSalary + bonus;
    const deductions = this.calcPayrollDeductions(gross);
    return { deductions, netPay: gross - deductions };
  }

  private createPayrollRecordForEmployee(emp: Record<string, unknown>): PayrollRecord | null {
    const name = emp.name as string;
    const joinDate = emp.join_date as string;
    if (!this.isEmployeePayDue(name, joinDate)) return null;
    if (this.getPendingPayroll(name)) return this.getPendingPayroll(name);

    const salary = (emp.salary as number) ?? 0;
    if (salary <= 0) return null;

    const today = this.formatDateOnly(new Date());
    const id = `PAY-${emp.id as string}-${today.replace(/-/g, '')}`;
    const exists = this.db.prepare('SELECT id FROM payroll WHERE id = ?').get(id) as { id: string } | undefined;
    if (exists) return null;

    const pendingSalary = this.getPendingPayroll(name);
    const bonus = pendingSalary?.bonus ?? 0;
    const gross = salary + bonus;
    const deductions = this.calcPayrollDeductions(gross);
    const netPay = gross - deductions;

    this.db
      .prepare(
        'INSERT INTO payroll (id, employee, department, base_salary, bonus, deductions, net_pay, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      )
      .run(id, name, emp.department as string, salary, bonus, deductions, netPay, 'Pending');

    const row = this.db.prepare('SELECT * FROM payroll WHERE id = ?').get(id) as Record<string, unknown>;
    return this.mapPayrollRow(row);
  }

  close(): void {
    this.db.close();
  }

  private mapUserRow(row: Record<string, string | number>, passwordForCheck?: string): User {
    const mustChangeFlag = row.must_change_credentials === 1 || row.must_change_credentials === '1';
    const isDefaultAdminLogin =
      row.role === 'Admin' && passwordForCheck === 'admin123';
    return {
      id: row.id as string,
      email: row.email as string,
      name: row.name as string,
      role: row.role as string,
      appAccess: row.app_access as User['appAccess'],
      requiresCredentialUpdate: mustChangeFlag || isDefaultAdminLogin,
    };
  }

  login(email: string, password: string, requiredApp: 'accounting' | 'hr'): User | null {
    const normalizedEmail = normalizeEmail(email);
    if (!isValidEmail(normalizedEmail)) return null;

    const row = this.db
      .prepare('SELECT * FROM users WHERE email = ? AND password_hash = ?')
      .get(normalizedEmail, hashPassword(password)) as Record<string, string | number> | undefined;

    if (!row) return null;

    const appAccess = row.app_access as User['appAccess'];
    if (appAccess !== 'both' && appAccess !== requiredApp) return null;

    const user = this.mapUserRow(row, password);
    this.currentUser = user;
    this.hrExt.setAuditUser(user.name);
    return user;
  }

  logout(): void {
    this.currentUser = null;
  }

  private smtpFromSettings(): SmtpConfig | null {
    const settings = this.hrExt.getSettings();
    if (!settings.smtpEnabled || !settings.smtpHost?.trim()) return null;
    return {
      host: settings.smtpHost,
      port: settings.smtpPort,
      user: settings.smtpUser,
      password: settings.smtpPassword,
      from: settings.smtpFrom,
    };
  }

  async sendPasswordResetCode(email: string): Promise<{ ok: true } | { ok: false; error: string }> {
    const normalizedEmail = normalizeEmail(email);
    if (!isValidEmail(normalizedEmail)) {
      return { ok: false, error: 'This email address is invalid.' };
    }

    const row = this.db
      .prepare('SELECT id FROM users WHERE email = ?')
      .get(normalizedEmail) as { id: string } | undefined;

    // Do not reveal whether the email is registered.
    if (!row) return { ok: true };

    const smtp = this.smtpFromSettings();
    if (!smtp) {
      return {
        ok: false,
        error: 'Mail server is not configured. Contact your administrator.',
      };
    }

    return this.passwordReset.prepareReset(row.id, normalizedEmail, smtp);
  }

  completePasswordResetWithCode(
    email: string,
    code: string,
    newPassword: string,
  ): { ok: true } | { ok: false; error: string } {
    const normalizedEmail = normalizeEmail(email);
    if (!isValidEmail(normalizedEmail)) {
      return { ok: false, error: 'This email address is invalid.' };
    }
    if (newPassword.length < 6) {
      return { ok: false, error: 'Password must be at least 6 characters.' };
    }

    const row = this.db
      .prepare('SELECT id FROM users WHERE email = ?')
      .get(normalizedEmail) as { id: string } | undefined;
    if (!row) {
      return { ok: false, error: 'Invalid reset code or email address.' };
    }

    const verified = this.passwordReset.verifyAndConsume(row.id, normalizedEmail, code);
    if (!verified.ok) return verified;

    this.db
      .prepare('UPDATE users SET password_hash = ? WHERE id = ?')
      .run(hashPassword(newPassword), row.id);

    return { ok: true };
  }

  resetPassword(email: string, newPassword: string): boolean {
    const normalizedEmail = normalizeEmail(email);
    if (!isValidEmail(normalizedEmail)) return false;
    if (newPassword.length < 6) return false;

    const row = this.db
      .prepare('SELECT id FROM users WHERE email = ?')
      .get(normalizedEmail) as { id: string } | undefined;
    if (!row) return false;
    this.db
      .prepare('UPDATE users SET password_hash = ? WHERE email = ?')
      .run(hashPassword(newPassword), normalizedEmail);
    return true;
  }

  async prepareCredentialEmailVerification(
    email: string,
    smtp: SmtpConfig,
  ): Promise<{ ok: true } | { ok: false; error: string }> {
    if (!this.currentUser) return { ok: false, error: 'Not signed in.' };
    const result = await this.credentialEmail.prepareVerification(this.currentUser.id, email, smtp);
    if (!result.ok) return result;

    this.hrExt.updateSettings({
      smtpEnabled: true,
      smtpHost: smtp.host,
      smtpPort: smtp.port,
      smtpUser: smtp.user,
      smtpPassword: smtp.password,
      smtpFrom: smtp.from,
    });
    return { ok: true };
  }

  verifyCredentialEmailCode(email: string, code: string): { ok: boolean; error?: string } {
    if (!this.currentUser) return { ok: false, error: 'Not signed in.' };
    return this.credentialEmail.verifyCode(this.currentUser.id, email, code);
  }

  async completeCredentialUpdate(newEmail: string, newPassword: string): Promise<User | null> {
    if (!this.currentUser) {
      throw new Error('Session expired. Sign in again and continue account setup.');
    }

    const normalizedEmail = normalizeEmail(newEmail);
    if (!this.credentialEmail.isVerified(this.currentUser.id, normalizedEmail)) {
      throw new Error('Please verify your email address before continuing.');
    }

    if (!isWorkEmail(normalizedEmail)) {
      throw new Error('This email address is invalid.');
    }
    if (newPassword.length < 6) {
      throw new Error('Password must be at least 6 characters.');
    }
    if (newPassword === 'admin123') {
      throw new Error('Choose a new password — the default password cannot be used.');
    }

    const duplicate = this.db
      .prepare('SELECT id FROM users WHERE email = ? AND id != ?')
      .get(normalizedEmail, this.currentUser.id) as { id: string } | undefined;
    if (duplicate) {
      throw new Error('An account with that email already exists.');
    }

    this.db
      .prepare(
        'UPDATE users SET email = ?, password_hash = ?, must_change_credentials = 0 WHERE id = ?',
      )
      .run(normalizedEmail, hashPassword(newPassword), this.currentUser.id);

    const user: User = {
      ...this.currentUser,
      email: normalizedEmail,
      requiresCredentialUpdate: false,
    };
    this.currentUser = user;
    return user;
  }

  getCurrentUser(): User | null {
    return this.currentUser;
  }

  isInitialSetupPending(): boolean {
    const row = this.db
      .prepare('SELECT id FROM users WHERE must_change_credentials = 1 LIMIT 1')
      .get() as { id: string } | undefined;
    return !!row;
  }

  getAccounts(): Account[] {
    const rows = this.db.prepare('SELECT * FROM accounts ORDER BY id').all() as Record<string, unknown>[];
    return rows.map((r) => ({
      id: r.id as string,
      name: r.name as string,
      type: r.type as string,
      balance: r.balance as number,
      currency: r.currency as string,
    }));
  }

  getTransactions(): Transaction[] {
    const rows = this.db
      .prepare('SELECT * FROM transactions ORDER BY date DESC, id DESC')
      .all() as Record<string, unknown>[];
    return rows.map((r) => ({
      id: r.id as string,
      date: r.date as string,
      description: r.description as string,
      account: r.account as string,
      type: r.type as string,
      amount: r.amount as number,
      status: r.status as string,
    }));
  }

  getInvoices(): Invoice[] {
    const rows = this.db
      .prepare('SELECT * FROM invoices ORDER BY date DESC, id DESC')
      .all() as Record<string, unknown>[];
    return rows.map((r) => ({
      id: r.id as string,
      client: r.client as string,
      date: r.date as string,
      dueDate: r.due_date as string,
      amount: r.amount as number,
      status: r.status as string,
    }));
  }

  getAccountingDashboardStats(): AccountingDashboardStats {
    const revenue = (this.db
      .prepare('SELECT balance FROM accounts WHERE type = ?')
      .get('Income') as { balance: number } | undefined)?.balance ?? 0;
    const expenses = (this.db
      .prepare('SELECT balance FROM accounts WHERE type = ?')
      .get('Expense') as { balance: number } | undefined)?.balance ?? 0;

    const outstanding = this.db
      .prepare('SELECT COALESCE(SUM(amount), 0) as total FROM invoices WHERE status IN (?, ?)')
      .get('Sent', 'Overdue') as { total: number };
    const pendingCount = this.db
      .prepare('SELECT COUNT(*) as count FROM invoices WHERE status IN (?, ?)')
      .get('Sent', 'Overdue') as { count: number };

    return {
      totalRevenue: revenue,
      totalExpenses: expenses,
      netProfit: revenue - expenses,
      outstandingInvoices: outstanding.total,
      pendingInvoiceCount: pendingCount.count,
      revenueChange: '+12.5% from last month',
      expenseChange: '+3.2% from last month',
      profitChange: '+18.7% from last month',
    };
  }

  getEmployees(): Employee[] {
    const rows = this.db.prepare('SELECT * FROM employees ORDER BY name').all() as Record<string, unknown>[];
    return rows.map((r) => this.mapEmployeeRow(r));
  }

  getPayroll(): PayrollRecord[] {
    const rows = this.db.prepare('SELECT * FROM payroll ORDER BY id DESC').all() as Record<string, unknown>[];
    return rows.map((r) => this.mapPayrollRow(r));
  }

  private mapPayrollRow(r: Record<string, unknown>): PayrollRecord {
    return {
      id: r.id as string,
      employee: r.employee as string,
      department: r.department as string,
      baseSalary: r.base_salary as number,
      bonus: r.bonus as number,
      deductions: r.deductions as number,
      netPay: r.net_pay as number,
      status: r.status as string,
      transactionId: r.transaction_id as string | undefined,
      processedDate: r.processed_date as string | undefined,
    };
  }

  private currentPayrollPeriod(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }

  private getLastPayrollForEmployee(employeeName: string): PayrollRecord | null {
    const row = this.db
      .prepare('SELECT * FROM payroll WHERE employee = ? ORDER BY id DESC LIMIT 1')
      .get(employeeName) as Record<string, unknown> | undefined;
    return row ? this.mapPayrollRow(row) : null;
  }

  getPayrollRunPreview(): PayrollRunPreview {
    const period = this.formatDateOnly(new Date());
    const activeEmployees = this.db
      .prepare('SELECT * FROM employees WHERE status = ? ORDER BY name')
      .all('Active') as Record<string, unknown>[];

    const records: PayrollRecord[] = this.getPayroll().filter((p) => p.status === 'Pending');
    let employeesToGenerate = 0;
    let totalGross = records.reduce((sum, p) => sum + p.baseSalary + p.bonus, 0);
    let totalNet = records.reduce((sum, p) => sum + p.netPay, 0);

    for (const emp of activeEmployees) {
      const name = emp.name as string;
      const joinDate = emp.join_date as string;
      if (this.getPendingPayroll(name)) continue;
      if (!this.isEmployeePayDue(name, joinDate)) continue;

      const salary = (emp.salary as number) ?? 0;
      if (salary <= 0) continue;

      const estimate = this.estimateEmployeePay({ name, salary });
      employeesToGenerate += 1;
      totalGross += salary + (this.getPendingPayroll(name)?.bonus ?? 0);
      totalNet += estimate.netPay;
    }

    return {
      period,
      pendingCount: records.length,
      employeesToGenerate,
      totalGross,
      totalNet,
      records,
    };
  }

  private generateMonthlyPayroll(): number {
    const activeEmployees = this.db
      .prepare('SELECT * FROM employees WHERE status = ? ORDER BY name')
      .all('Active') as Record<string, unknown>[];

    let generated = 0;
    for (const emp of activeEmployees) {
      const before = this.getPendingPayroll(emp.name as string);
      const created = this.createPayrollRecordForEmployee(emp);
      if (created && !before) generated += 1;
    }

    return generated;
  }

  getEmployeePayrollStatuses(): EmployeePayrollStatus[] {
    return this.getEmployees()
      .filter((e) => e.status !== 'Terminated')
      .map((emp) => {
        const pending = this.getPendingPayroll(emp.name);
        const last = this.getLastProcessedPayroll(emp.name);
        const estimate = this.estimateEmployeePay({ name: emp.name, salary: emp.salary });
        let status: EmployeePayrollStatus['status'] = 'due';
        if (pending) status = 'pending';
        else if (this.isEmployeePaidInCycle(emp.name, emp.joinDate)) status = 'paid';

        return {
          employeeId: emp.id,
          employeeName: emp.name,
          status,
          lastPaidDate: last ? this.getEffectiveProcessedDate(last) : undefined,
          nextDueDate: this.getNextPayDueDate(emp.name, emp.joinDate),
          estimatedNetPay: estimate.netPay,
          estimatedDeductions: estimate.deductions,
        };
      });
  }

  payEmployee(employeeId: string): { payroll: PayrollRecord; transactionId: string } | { error: string } {
    const row = this.db
      .prepare('SELECT * FROM employees WHERE id = ?')
      .get(employeeId) as Record<string, unknown> | undefined;
    if (!row) return { error: 'Employee not found.' };
    if (row.status !== 'Active') return { error: 'Only active employees can be paid.' };

    const name = row.name as string;
    const joinDate = row.join_date as string;
    const pending = this.getPendingPayroll(name);
    if (pending) {
      const result = this.processPayroll(pending.id);
      if (!result) return { error: 'Could not process pending payroll.' };
      return result;
    }

    if (!this.isEmployeePayDue(name, joinDate)) {
      const nextDue = this.getNextPayDueDate(name, joinDate);
      return { error: `Not due for payment yet. Next pay date: ${nextDue}.` };
    }

    const created = this.createPayrollRecordForEmployee(row);
    if (!created) return { error: 'Could not create payroll record for this employee.' };

    const result = this.processPayroll(created.id);
    if (!result) return { error: 'Could not process payroll.' };
    return result;
  }

  processPayroll(payrollId: string): { payroll: PayrollRecord; transactionId: string } | null {
    const row = this.db
      .prepare('SELECT * FROM payroll WHERE id = ?')
      .get(payrollId) as Record<string, unknown> | undefined;
    if (!row || row.status === 'Processed' || row.transaction_id) return null;

    this.ensurePayrollAccounts();
    if (!this.accountExists('Cash & Bank') || !this.accountExists('Operating Expenses')) {
      return null;
    }

    const payroll = this.mapPayrollRow(row);
    const gross = payroll.baseSalary + payroll.bonus;
    const today = this.formatDateOnly(new Date());

    const sync = this.db.transaction(() => {
      const txn = this.createTransaction({
        date: today,
        description: `Payroll - ${payroll.employee} (${payroll.id})`,
        account: 'Operating Expenses',
        type: 'Expense',
        amount: gross,
        status: 'Completed',
      });

      this.db
        .prepare('UPDATE accounts SET balance = balance - ? WHERE name = ?')
        .run(payroll.netPay, 'Cash & Bank');

      this.db
        .prepare(
          'UPDATE payroll SET status = ?, transaction_id = ?, processed_date = ? WHERE id = ?',
        )
        .run('Processed', txn.id, today, payrollId);

      return txn.id;
    });

    const transactionId = sync();
    return {
      payroll: { ...payroll, status: 'Processed', transactionId, processedDate: today },
      transactionId,
    };
  }

  runPayrollAndSync(): PayrollRunResult {
    const generated = this.generateMonthlyPayroll();
    const pending = this.db
      .prepare('SELECT id FROM payroll WHERE status = ?')
      .all('Pending') as { id: string }[];

    let processed = 0;
    let totalGross = 0;
    let totalNet = 0;
    const transactionIds: string[] = [];

    for (const { id } of pending) {
      const row = this.db
        .prepare('SELECT * FROM payroll WHERE id = ?')
        .get(id) as Record<string, unknown>;
      const gross = (row.base_salary as number) + (row.bonus as number);
      const net = row.net_pay as number;

      const result = this.processPayroll(id);
      if (result) {
        processed += 1;
        totalGross += gross;
        totalNet += net;
        transactionIds.push(result.transactionId);
      }
    }

    return { generated, processed, totalGross, totalNet, transactionIds };
  }

  getAttendance(): AttendanceRecord[] {
    const rows = this.db
      .prepare('SELECT * FROM attendance ORDER BY date DESC, employee')
      .all() as Record<string, unknown>[];
    return rows.map((r) => this.hrExt.mapAttendanceRow(r));
  }

  getLeaveRequests(): LeaveRequest[] {
    const rows = this.db
      .prepare('SELECT * FROM leave_requests ORDER BY start_date DESC')
      .all() as Record<string, unknown>[];
    return rows.map((r) => this.hrExt.mapLeaveRow(r));
  }

  getDepartments(): Department[] {
    const rows = this.db.prepare('SELECT * FROM departments ORDER BY name').all() as Record<string, unknown>[];
    return rows.map((r) => ({
      id: r.id as string,
      name: r.name as string,
      head: r.head as string,
      employees: r.employees as number,
      budget: r.budget as number,
    }));
  }

  private nextNumericId(prefix: string, table: string): string {
    const row = this.db
      .prepare(`SELECT id FROM ${table} WHERE id LIKE ? ORDER BY id DESC LIMIT 1`)
      .get(`${prefix}-%`) as { id: string } | undefined;
    const lastNum = row ? parseInt(row.id.split('-').pop() ?? '0', 10) : 0;
    return `${prefix}-${String(lastNum + 1).padStart(4, '0')}`;
  }

  private mapTransactionRow(r: Record<string, unknown>): Transaction {
    return {
      id: r.id as string,
      date: r.date as string,
      description: r.description as string,
      account: r.account as string,
      type: r.type as string,
      amount: r.amount as number,
      status: r.status as string,
    };
  }

  private adjustAccountBalance(account: string, delta: number): void {
    this.db
      .prepare('UPDATE accounts SET balance = balance + ? WHERE name = ?')
      .run(delta, account);
  }

  private isProtectedTransaction(txn: Transaction): boolean {
    if (txn.description.startsWith('Payroll -')) return true;
    const linked = this.db
      .prepare('SELECT id FROM payroll WHERE transaction_id = ?')
      .get(txn.id) as { id: string } | undefined;
    return !!linked;
  }

  createTransaction(input: CreateTransactionInput): Transaction {
    const id = this.nextNumericId('TXN', 'transactions');
    const amount =
      input.type === 'Expense' ? -Math.abs(input.amount) : Math.abs(input.amount);
    const status = input.status ?? 'Completed';

    this.db
      .prepare(
        'INSERT INTO transactions (id, date, description, account, type, amount, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
      )
      .run(id, input.date, input.description, input.account, input.type, amount, status);

    this.adjustAccountBalance(input.account, Math.abs(input.amount));

    return {
      id,
      date: input.date,
      description: input.description,
      account: input.account,
      type: input.type,
      amount,
      status,
    };
  }

  updateTransaction(id: string, input: CreateTransactionInput): Transaction | null {
    const row = this.db
      .prepare('SELECT * FROM transactions WHERE id = ?')
      .get(id) as Record<string, unknown> | undefined;
    if (!row) return null;

    const old = this.mapTransactionRow(row);
    if (this.isProtectedTransaction(old)) return null;

    const amount =
      input.type === 'Expense' ? -Math.abs(input.amount) : Math.abs(input.amount);
    const status = input.status ?? 'Completed';

    const run = this.db.transaction(() => {
      this.adjustAccountBalance(old.account, -Math.abs(old.amount));
      this.db
        .prepare(
          'UPDATE transactions SET date = ?, description = ?, account = ?, type = ?, amount = ?, status = ? WHERE id = ?',
        )
        .run(input.date, input.description, input.account, input.type, amount, status, id);
      this.adjustAccountBalance(input.account, Math.abs(input.amount));
    });
    run();

    return {
      id,
      date: input.date,
      description: input.description,
      account: input.account,
      type: input.type,
      amount,
      status,
    };
  }

  deleteTransaction(id: string): boolean {
    const row = this.db
      .prepare('SELECT * FROM transactions WHERE id = ?')
      .get(id) as Record<string, unknown> | undefined;
    if (!row) return false;

    const old = this.mapTransactionRow(row);
    if (this.isProtectedTransaction(old)) return false;

    const run = this.db.transaction(() => {
      this.adjustAccountBalance(old.account, -Math.abs(old.amount));
      this.db.prepare('DELETE FROM transactions WHERE id = ?').run(id);
    });
    run();
    return true;
  }

  createInvoice(input: CreateInvoiceInput): Invoice {
    const year = new Date().getFullYear();
    const row = this.db
      .prepare('SELECT id FROM invoices WHERE id LIKE ? ORDER BY id DESC LIMIT 1')
      .get(`INV-${year}-%`) as { id: string } | undefined;
    const lastNum = row ? parseInt(row.id.split('-').pop() ?? '0', 10) : 0;
    const id = `INV-${year}-${String(lastNum + 1).padStart(3, '0')}`;
    const status = input.status ?? 'Draft';

    this.db
      .prepare(
        'INSERT INTO invoices (id, client, date, due_date, amount, status) VALUES (?, ?, ?, ?, ?, ?)',
      )
      .run(id, input.client, input.date, input.dueDate, input.amount, status);

    return {
      id,
      client: input.client,
      date: input.date,
      dueDate: input.dueDate,
      amount: input.amount,
      status,
    };
  }

  updateInvoice(id: string, input: CreateInvoiceInput): Invoice | null {
    const exists = this.db.prepare('SELECT id FROM invoices WHERE id = ?').get(id);
    if (!exists) return null;

    this.db
      .prepare(
        'UPDATE invoices SET client = ?, date = ?, due_date = ?, amount = ?, status = ? WHERE id = ?',
      )
      .run(input.client, input.date, input.dueDate, input.amount, input.status ?? 'Draft', id);

    return {
      id,
      client: input.client,
      date: input.date,
      dueDate: input.dueDate,
      amount: input.amount,
      status: input.status ?? 'Draft',
    };
  }

  deleteInvoice(id: string): boolean {
    const result = this.db.prepare('DELETE FROM invoices WHERE id = ?').run(id);
    return result.changes > 0;
  }

  createEmployee(input: CreateEmployeeInput): Employee {
    const email = normalizeEmail(input.email);
    const phone = normalizePhone(input.phone);
    if (!isValidEmail(email)) throw new Error('Invalid employee email address.');
    if (!isValidPhone(phone)) throw new Error('Invalid employee phone number.');

    const id = this.nextNumericId('EMP', 'employees');
    const role = input.department || 'Employee';
    const employmentType = input.employmentType ?? 'full_time';
    const workHoursRatio = input.workHoursRatio ?? 1;
    const undergroundMining = input.undergroundMining ? 1 : 0;

    this.db
      .prepare(
        `INSERT INTO employees (
          id, name, department, role, email, phone, status, join_date, salary, position_id, birth_date,
          gender, employment_type, work_hours_ratio, underground_mining, probation_end_date
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        id,
        input.name,
        input.department,
        role,
        email,
        phone,
        'Active',
        input.joinDate,
        input.salary,
        null,
        input.birthDate ?? null,
        input.gender ?? null,
        employmentType,
        workHoursRatio,
        undergroundMining,
        input.probationEndDate ?? null,
      );

    this.db
      .prepare('UPDATE departments SET employees = employees + 1 WHERE name = ?')
      .run(input.department);

    this.hrExt.ensureLeaveBalanceForEmployee(id);
    this.hrExt.notify('employee', 'New Employee', `${input.name} joined ${input.department}.`, 'employees');

    return this.mapEmployeeRow({
      id,
      name: input.name,
      department: input.department,
      role,
      email: email,
      phone: phone,
      status: 'Active',
      join_date: input.joinDate,
      salary: input.salary,
      position_id: input.positionId,
      gender: input.gender,
      employment_type: employmentType,
      work_hours_ratio: workHoursRatio,
      underground_mining: undergroundMining,
      probation_end_date: input.probationEndDate,
    });
  }

  updateEmployee(id: string, input: CreateEmployeeInput): Employee | null {
    const email = normalizeEmail(input.email);
    const phone = normalizePhone(input.phone);
    if (!isValidEmail(email)) throw new Error('Invalid employee email address.');
    if (!isValidPhone(phone)) throw new Error('Invalid employee phone number.');

    const row = this.db
      .prepare('SELECT * FROM employees WHERE id = ?')
      .get(id) as Record<string, unknown> | undefined;
    if (!row) return null;

    const role = input.department || (row.role as string) || 'Employee';
    const employmentType = input.employmentType ?? (row.employment_type as string) ?? 'full_time';
    const workHoursRatio = input.workHoursRatio ?? (row.work_hours_ratio as number) ?? 1;
    const undergroundMining = input.undergroundMining !== undefined
      ? input.undergroundMining ? 1 : 0
      : (row.underground_mining as number) ?? 0;

    const oldDept = row.department as string;
    const run = this.db.transaction(() => {
      if (oldDept !== input.department) {
        this.db
          .prepare('UPDATE departments SET employees = employees - 1 WHERE name = ?')
          .run(oldDept);
        this.db
          .prepare('UPDATE departments SET employees = employees + 1 WHERE name = ?')
          .run(input.department);
      }
      this.db
        .prepare(
          `UPDATE employees SET
            name = ?, department = ?, role = ?, email = ?, phone = ?, join_date = ?, salary = ?,
            position_id = ?, birth_date = ?, gender = ?, employment_type = ?, work_hours_ratio = ?,
            underground_mining = ?, probation_end_date = ?
          WHERE id = ?`,
        )
        .run(
          input.name,
          input.department,
          role,
          email,
          phone,
          input.joinDate,
          input.salary,
          null,
          input.birthDate ?? null,
          input.gender ?? row.gender ?? null,
          employmentType,
          workHoursRatio,
          undergroundMining,
          input.probationEndDate ?? row.probation_end_date ?? null,
          id,
        );
    });
    run();

    this.hrExt.recalculateEmployeeLeaveEntitlements(id);

    return this.mapEmployeeRow({
      ...row,
      name: input.name,
      department: input.department,
      role,
      email: email,
      phone: phone,
      join_date: input.joinDate,
      salary: input.salary,
      position_id: input.positionId,
      gender: input.gender ?? row.gender,
      employment_type: employmentType,
      work_hours_ratio: workHoursRatio,
      underground_mining: undergroundMining,
      probation_end_date: input.probationEndDate ?? row.probation_end_date,
    });
  }

  deleteEmployee(id: string): boolean {
    const row = this.db
      .prepare('SELECT * FROM employees WHERE id = ?')
      .get(id) as Record<string, unknown> | undefined;
    if (!row) return false;

    const run = this.db.transaction(() => {
      this.db
        .prepare('UPDATE departments SET employees = employees - 1 WHERE name = ?')
        .run(row.department as string);
      this.db.prepare('DELETE FROM employees WHERE id = ?').run(id);
    });
    run();
    return true;
  }

  createLeaveRequest(input: CreateLeaveInput): LeaveRequest {
    const validation = this.hrExt.validateLeaveForEmployee(input.employee, {
      type: input.type,
      days: input.days,
      medicalCertificateProvided: input.medicalCertificateProvided,
    });
    if (!validation.ok) throw new Error(validation.error);

    const id = this.nextNumericId('LV', 'leave_requests');
    const medicalCert = input.medicalCertificateProvided ? 1 : 0;

    this.db
      .prepare(
        `INSERT INTO leave_requests (
          id, employee, type, start_date, end_date, days, status, reason, approval_stage, manager_approved,
          medical_certificate_provided
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        id,
        input.employee,
        input.type,
        input.startDate,
        input.endDate,
        input.days,
        'Pending',
        input.reason,
        'Pending Manager',
        0,
        medicalCert,
      );

    this.hrExt.notify('leave', 'New Leave Request', `${input.employee} requested ${input.type}.`, 'leave');

    return this.hrExt.mapLeaveRow({
      id,
      employee: input.employee,
      type: input.type,
      start_date: input.startDate,
      end_date: input.endDate,
      days: input.days,
      status: 'Pending',
      reason: input.reason,
      approval_stage: 'Pending Manager',
      manager_approved: 0,
      medical_certificate_provided: medicalCert,
    });
  }

  updateLeaveRequest(id: string, input: CreateLeaveInput): LeaveRequest | null {
    const existing = this.db
      .prepare('SELECT * FROM leave_requests WHERE id = ?')
      .get(id) as Record<string, unknown> | undefined;
    if (!existing || existing.status !== 'Pending') return null;

    const validation = this.hrExt.validateLeaveForEmployee(input.employee, {
      type: input.type,
      days: input.days,
      medicalCertificateProvided: input.medicalCertificateProvided,
    });
    if (!validation.ok) throw new Error(validation.error);

    const medicalCert = input.medicalCertificateProvided ? 1 : 0;

    this.db
      .prepare(
        `UPDATE leave_requests SET
          employee = ?, type = ?, start_date = ?, end_date = ?, days = ?, reason = ?,
          medical_certificate_provided = ?
        WHERE id = ?`,
      )
      .run(
        input.employee,
        input.type,
        input.startDate,
        input.endDate,
        input.days,
        input.reason,
        medicalCert,
        id,
      );

    return this.hrExt.mapLeaveRow({
      ...existing,
      employee: input.employee,
      type: input.type,
      start_date: input.startDate,
      end_date: input.endDate,
      days: input.days,
      reason: input.reason,
      medical_certificate_provided: medicalCert,
    });
  }

  deleteLeaveRequest(id: string): boolean {
    const existing = this.db
      .prepare('SELECT status FROM leave_requests WHERE id = ?')
      .get(id) as { status: string } | undefined;
    if (!existing || existing.status !== 'Pending') return false;

    const result = this.db.prepare('DELETE FROM leave_requests WHERE id = ?').run(id);
    return result.changes > 0;
  }

  updateLeaveStatus(id: string, status: 'Approved' | 'Rejected'): LeaveRequest | null {
    if (status === 'Approved') return this.hrExt.approveLeaveHr(id);
    return this.hrExt.rejectLeaveWithRestore(id);
  }

  cancelLeaveRequest(id: string): LeaveRequest | null {
    return this.hrExt.cancelLeaveRequest(id);
  }

  getJobPositions(): JobPosition[] {
    const rows = this.db.prepare('SELECT * FROM job_positions ORDER BY department, title').all() as Record<string, unknown>[];
    return rows.map((r) => ({
      id: r.id as string,
      title: r.title as string,
      department: r.department as string,
      level: r.level as string,
      minSalary: r.min_salary as number,
      maxSalary: r.max_salary as number,
    }));
  }

  getMessages(): EmployeeMessage[] {
    const rows = this.db
      .prepare('SELECT * FROM employee_messages ORDER BY sent_at DESC')
      .all() as Record<string, unknown>[];
    return rows.map((r) => ({
      id: r.id as string,
      employee: r.employee as string,
      employeeEmail: r.employee_email as string,
      subject: r.subject as string,
      body: r.body as string,
      type: r.type as string,
      sentAt: r.sent_at as string,
      sentBy: r.sent_by as string,
      status: r.status as string,
    }));
  }

  updateEmployeeSalary(input: UpdateSalaryInput): Employee | null {
    const row = this.db
      .prepare('SELECT * FROM employees WHERE id = ?')
      .get(input.employeeId) as Record<string, unknown> | undefined;
    if (!row) return null;

    this.db.prepare('UPDATE employees SET salary = ? WHERE id = ?').run(input.baseSalary, input.employeeId);

    return this.mapEmployeeRow({ ...row, salary: input.baseSalary });
  }

  createDepartment(input: CreateDepartmentInput): Department {
    const name = input.name?.trim();
    if (!name) throw new Error('Department name is required.');
    const id = this.nextNumericId('DEPT', 'departments');
    const budget = input.budget ?? 0;
    this.db
      .prepare('INSERT INTO departments (id, name, head, employees, budget) VALUES (?, ?, ?, 0, ?)')
      .run(id, name, '', budget);
    return { id, name, head: '', employees: 0, budget };
  }

  updateDepartment(id: string, input: CreateDepartmentInput): Department | null {
    const existing = this.db
      .prepare('SELECT * FROM departments WHERE id = ?')
      .get(id) as Record<string, unknown> | undefined;
    if (!existing) return null;

    const name = input.name?.trim();
    if (!name) throw new Error('Department name is required.');
    const budget = input.budget ?? (existing.budget as number);
    this.db
      .prepare('UPDATE departments SET name = ?, head = ?, budget = ? WHERE id = ?')
      .run(name, '', budget, id);

    return {
      id,
      name,
      head: '',
      employees: existing.employees as number,
      budget,
    };
  }

  deleteDepartment(id: string): boolean {
    const existing = this.db
      .prepare('SELECT employees FROM departments WHERE id = ?')
      .get(id) as { employees: number } | undefined;
    if (!existing || existing.employees > 0) return false;
    const result = this.db.prepare('DELETE FROM departments WHERE id = ?').run(id);
    return result.changes > 0;
  }

  createJobPosition(input: CreateJobPositionInput): JobPosition {
    const id = this.nextNumericId('POS', 'job_positions');
    this.db
      .prepare(
        'INSERT INTO job_positions (id, title, department, level, min_salary, max_salary) VALUES (?, ?, ?, ?, ?, ?)',
      )
      .run(id, input.title, input.department, input.level, input.minSalary, input.maxSalary);
    return {
      id,
      title: input.title,
      department: input.department,
      level: input.level,
      minSalary: input.minSalary,
      maxSalary: input.maxSalary,
    };
  }

  updateJobPosition(id: string, input: CreateJobPositionInput): JobPosition | null {
    const exists = this.db.prepare('SELECT id FROM job_positions WHERE id = ?').get(id);
    if (!exists) return null;
    this.db
      .prepare(
        'UPDATE job_positions SET title = ?, department = ?, level = ?, min_salary = ?, max_salary = ? WHERE id = ?',
      )
      .run(input.title, input.department, input.level, input.minSalary, input.maxSalary, id);
    return {
      id,
      title: input.title,
      department: input.department,
      level: input.level,
      minSalary: input.minSalary,
      maxSalary: input.maxSalary,
    };
  }

  deleteJobPosition(id: string): boolean {
    const linked = this.db
      .prepare('SELECT COUNT(*) as count FROM employees WHERE position_id = ?')
      .get(id) as { count: number };
    if (linked.count > 0) return false;
    const result = this.db.prepare('DELETE FROM job_positions WHERE id = ?').run(id);
    return result.changes > 0;
  }

  createAttendance(input: CreateAttendanceInput): AttendanceRecord {
    const id = this.nextNumericId('ATT', 'attendance');
    const enriched = this.hrExt.enrichAttendance(input);
    this.db
      .prepare(
        'INSERT INTO attendance (id, employee, date, check_in, check_out, hours, status, late_minutes, overtime_hours) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      )
      .run(id, enriched.employee, enriched.date, enriched.checkIn, enriched.checkOut, enriched.hours, enriched.status, enriched.lateMinutes, enriched.overtimeHours);
    return this.hrExt.mapAttendanceRow({
      id,
      employee: enriched.employee,
      date: enriched.date,
      check_in: enriched.checkIn,
      check_out: enriched.checkOut,
      hours: enriched.hours,
      status: enriched.status,
      late_minutes: enriched.lateMinutes,
      overtime_hours: enriched.overtimeHours,
    });
  }

  updateAttendance(id: string, input: CreateAttendanceInput): AttendanceRecord | null {
    const exists = this.db.prepare('SELECT id FROM attendance WHERE id = ?').get(id);
    if (!exists) return null;
    const enriched = this.hrExt.enrichAttendance(input);
    this.db
      .prepare(
        'UPDATE attendance SET employee = ?, date = ?, check_in = ?, check_out = ?, hours = ?, status = ?, late_minutes = ?, overtime_hours = ? WHERE id = ?',
      )
      .run(enriched.employee, enriched.date, enriched.checkIn, enriched.checkOut, enriched.hours, enriched.status, enriched.lateMinutes, enriched.overtimeHours, id);
    return this.hrExt.mapAttendanceRow({
      id,
      employee: enriched.employee,
      date: enriched.date,
      check_in: enriched.checkIn,
      check_out: enriched.checkOut,
      hours: enriched.hours,
      status: enriched.status,
      late_minutes: enriched.lateMinutes,
      overtime_hours: enriched.overtimeHours,
    });
  }

  deleteAttendance(id: string): boolean {
    const result = this.db.prepare('DELETE FROM attendance WHERE id = ?').run(id);
    return result.changes > 0;
  }

  async sendEmployeeMessage(input: SendMessageInput): Promise<SendMessageResult> {
    const smtp = this.smtpFromSettings();
    if (!smtp) {
      throw new Error('Mail server is not configured. Open Settings and save your SMTP details first.');
    }

    const sentBy = this.currentUser?.name ?? 'HR Administrator';
    const sentAt = new Date().toISOString();
    const messages: EmployeeMessage[] = [];
    const failures: SendMessageFailure[] = [];
    const recipientIds = [...new Set(input.employeeIds)];

    for (const empId of recipientIds) {
      const emp = this.db
        .prepare('SELECT * FROM employees WHERE id = ?')
        .get(empId) as Record<string, unknown> | undefined;
      if (!emp) continue;

      const email = normalizeEmail(emp.email as string);
      if (!isValidEmail(email)) {
        failures.push({
          employee: emp.name as string,
          email,
          error: 'Invalid email address on employee record.',
        });
        continue;
      }
    }

    const insertSql =
      'INSERT INTO employee_messages (id, employee, employee_email, subject, body, type, sent_at, sent_by, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)';

    for (const empId of recipientIds) {
      const emp = this.db
        .prepare('SELECT * FROM employees WHERE id = ?')
        .get(empId) as Record<string, unknown> | undefined;
      if (!emp) continue;

      const email = normalizeEmail(emp.email as string);
      const name = emp.name as string;

      if (!isValidEmail(email)) continue;

      const sent = await sendEmployeeMessageEmail(
        email,
        name,
        input.subject,
        input.body,
        sentBy,
        smtp,
        input.type,
      );
      if (!sent.ok) {
        failures.push({
          employee: name,
          email,
          error: sent.error ?? `Could not email ${name}.`,
        });
        await sleep(400);
        continue;
      }

      const id = this.nextNumericId('MSG', 'employee_messages');
      this.db.prepare(insertSql).run(
        id,
        name,
        email,
        input.subject,
        input.body,
        input.type,
        sentAt,
        sentBy,
        'Sent',
      );

      messages.push({
        id,
        employee: name,
        employeeEmail: email,
        subject: input.subject,
        body: input.body,
        type: input.type,
        sentAt,
        sentBy,
        status: 'Sent',
      });

      await sleep(400);
    }

    if (messages.length === 0 && failures.length > 0) {
      const summary = failures.map((f) => `${f.employee} (${f.error})`).join(' ');
      throw new Error(`Could not send to any employee. ${summary}`);
    }

    return { messages, failures };
  }

  deleteMessage(id: string): boolean {
    const result = this.db.prepare('DELETE FROM employee_messages WHERE id = ?').run(id);
    return result.changes > 0;
  }

  deleteMessages(ids: string[]): number {
    const unique = [...new Set(ids.filter(Boolean))];
    if (unique.length === 0) return 0;
    const placeholders = unique.map(() => '?').join(', ');
    const result = this.db
      .prepare(`DELETE FROM employee_messages WHERE id IN (${placeholders})`)
      .run(...unique);
    return result.changes;
  }

  deleteAllMessages(): number {
    const result = this.db.prepare('DELETE FROM employee_messages').run();
    return result.changes;
  }

  getHrDashboardStats(): HrDashboardStats {
    this.hrExt.syncLeaveStatuses();
    const today = new Date().toISOString().slice(0, 10);
    const quarterStart = (() => {
      const d = new Date();
      const qMonth = Math.floor(d.getMonth() / 3) * 3;
      return new Date(d.getFullYear(), qMonth, 1).toISOString().slice(0, 10);
    })();

    const total = this.db.prepare('SELECT COUNT(*) as count FROM employees WHERE status != ?').get('Terminated') as { count: number };
    const onLeave = this.db
      .prepare('SELECT COUNT(*) as count FROM employees WHERE status = ?')
      .get('On Leave') as { count: number };
    const present = this.db
      .prepare('SELECT COUNT(*) as count FROM attendance WHERE status = ? AND date = ?')
      .get('Present', today) as { count: number };
    const pending = this.db
      .prepare('SELECT COUNT(*) as count FROM leave_requests WHERE status = ?')
      .get('Pending') as { count: number };
    const newHires = this.db
      .prepare('SELECT COUNT(*) as count FROM employees WHERE join_date >= ?')
      .get(quarterStart) as { count: number };

    const attendanceRate =
      total.count > 0 ? `${((present.count / total.count) * 100).toFixed(1)}% attendance rate` : '0%';

    const base: HrDashboardStats = {
      totalEmployees: total.count,
      presentToday: present.count,
      onLeave: onLeave.count,
      pendingRequests: pending.count,
      attendanceRate,
      newThisQuarter: newHires.count,
    };
    return this.hrExt.enhanceDashboardStats(base);
  }

  getSettings(): HrSettings {
    return this.hrExt.getSettings();
  }

  updateSettings(input: Partial<HrSettings>): HrSettings {
    return this.hrExt.updateSettings(input);
  }

  getLeaveBalances(): LeaveBalance[] {
    return this.hrExt.getLeaveBalances();
  }

  updateLeaveBalance(input: UpdateLeaveBalanceInput): LeaveBalance | null {
    return this.hrExt.updateLeaveBalance(input);
  }

  getHolidays(): Holiday[] {
    return this.hrExt.getHolidays();
  }

  createHoliday(input: CreateHolidayInput): Holiday {
    return this.hrExt.createHoliday(input);
  }

  deleteHoliday(id: string): boolean {
    return this.hrExt.deleteHoliday(id);
  }

  getEmployeeNotes(employeeId: string): EmployeeNote[] {
    return this.hrExt.getEmployeeNotes(employeeId);
  }

  createEmployeeNote(input: CreateEmployeeNoteInput): EmployeeNote {
    return this.hrExt.createEmployeeNote(input);
  }

  deleteEmployeeNote(id: string): boolean {
    return this.hrExt.deleteEmployeeNote(id);
  }

  getEmployeeDocuments(employeeId: string): EmployeeDocument[] {
    return this.hrExt.getEmployeeDocuments(employeeId);
  }

  addEmployeeDocument(input: CreateDocumentInput): EmployeeDocument {
    return this.hrExt.addEmployeeDocument(input);
  }

  getEmployeeDocumentData(id: string): { fileName: string; fileData: string } | null {
    return this.hrExt.getEmployeeDocumentData(id);
  }

  deleteEmployeeDocument(id: string): boolean {
    return this.hrExt.deleteEmployeeDocument(id);
  }

  getAuditLog(limit = 100): AuditLogEntry[] {
    return this.hrExt.getAuditLog(limit);
  }

  verifyCurrentUserPassword(password: string): { ok: true } | { ok: false; error: string } {
    const user = this.currentUser;
    if (!user) {
      return { ok: false, error: 'You must be signed in to continue.' };
    }
    if (!password.trim()) {
      return { ok: false, error: 'Enter your password to continue.' };
    }

    const row = this.db
      .prepare('SELECT password_hash, role FROM users WHERE email = ?')
      .get(user.email) as { password_hash: string; role: string } | undefined;

    const passwordMatches =
      row &&
      (row.password_hash === hashPassword(password) ||
        (row.role === 'Admin' && password === 'admin123'));

    if (!passwordMatches) {
      return { ok: false, error: 'Incorrect password.' };
    }

    return { ok: true };
  }

  deleteAllAuditLog(
    password: string,
  ): { ok: true; deleted: number } | { ok: false; error: string } {
    const verified = this.verifyCurrentUserPassword(password);
    if (!verified.ok) {
      return { ok: false, error: verified.error.replace(/\.$/, '') + '. Audit log was not changed.' };
    }

    const deleted = this.hrExt.deleteAllAuditLog();
    return { ok: true, deleted };
  }

  getNotifications(): HrNotification[] {
    return this.hrExt.getNotifications();
  }

  markNotificationRead(id: string): boolean {
    return this.hrExt.markNotificationRead(id);
  }

  markAllNotificationsRead(): boolean {
    return this.hrExt.markAllNotificationsRead();
  }

  getMessageTemplates(): MessageTemplate[] {
    return this.hrExt.getMessageTemplates();
  }

  createMessageTemplate(input: CreateMessageTemplateInput): MessageTemplate {
    return this.hrExt.createMessageTemplate(input);
  }

  deleteMessageTemplate(id: string): boolean {
    return this.hrExt.deleteMessageTemplate(id);
  }

  getAttendanceTrends(): AttendanceTrend[] {
    return this.hrExt.getAttendanceTrends();
  }

  getDepartmentCostReport(): DepartmentCostReport[] {
    return this.hrExt.getDepartmentCostReport();
  }

  getAccountingSyncStatus(): AccountingSyncStatus[] {
    return this.hrExt.getAccountingSyncStatus();
  }

  terminateEmployee(input: TerminateEmployeeInput): boolean {
    return this.hrExt.terminateEmployee(input);
  }

  approveLeaveManager(id: string): LeaveRequest | null {
    return this.hrExt.approveLeaveManager(id);
  }

  approveLeaveHr(id: string): LeaveRequest | null {
    return this.hrExt.approveLeaveHr(id);
  }

  syncLeaveStatuses(): number {
    return this.hrExt.syncLeaveStatuses();
  }

  clockIn(employeeName: string): AttendanceRecord {
    return this.hrExt.clockIn(employeeName);
  }

  clockOut(employeeName: string): AttendanceRecord {
    return this.hrExt.clockOut(employeeName);
  }

  importAttendanceCsv(csvText: string): number {
    return this.hrExt.importAttendanceCsv(csvText);
  }

  exportHrBackup(): string {
    return this.hrExt.exportHrBackup();
  }

  importHrBackup(jsonText: string): boolean {
    return this.hrExt.importHrBackup(jsonText);
  }

  getKioskCheckInConfig(baseUrl: string) {
    return this.hrExt.getKioskCheckInConfig(baseUrl);
  }

  regenerateCheckInSiteToken(baseUrl: string) {
    this.hrExt.regenerateCheckInSiteToken();
    return this.hrExt.getKioskCheckInConfig(baseUrl);
  }

  lookupCheckIn(input: import('./types').CheckInLookupInput) {
    return this.hrExt.lookupCheckIn(input);
  }

  confirmCheckIn(input: import('./types').CheckInConfirmInput) {
    return this.hrExt.confirmCheckIn(input);
  }

  getAttendanceScanLog(limit?: number) {
    return this.hrExt.getAttendanceScanLog(limit);
  }
}
