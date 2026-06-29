import type { DbClient } from './db-client';
import { addColumnIfMissing, sqlInsertIgnore } from './dialect';

export function migrateHrExtensions(db: DbClient): void {
  addColumnIfMissing(db, 'employees', 'birth_date', 'TEXT');
  addColumnIfMissing(db, 'employees', 'end_date', 'TEXT');
  addColumnIfMissing(db, 'employees', 'termination_reason', 'TEXT');
  addColumnIfMissing(db, 'employees', 'phone', "TEXT NOT NULL DEFAULT ''");
  addColumnIfMissing(db, 'employees', 'gender', 'TEXT');
  addColumnIfMissing(db, 'employees', 'employment_type', "TEXT NOT NULL DEFAULT 'full_time'");
  addColumnIfMissing(db, 'employees', 'work_hours_ratio', 'REAL NOT NULL DEFAULT 1');
  addColumnIfMissing(db, 'employees', 'underground_mining', 'INTEGER NOT NULL DEFAULT 0');
  addColumnIfMissing(db, 'employees', 'probation_end_date', 'TEXT');

  addColumnIfMissing(db, 'leave_requests', 'approval_stage', "TEXT NOT NULL DEFAULT 'Pending Manager'");
  addColumnIfMissing(db, 'leave_requests', 'manager_approved', 'INTEGER NOT NULL DEFAULT 0');
  addColumnIfMissing(db, 'leave_requests', 'medical_certificate_provided', 'INTEGER NOT NULL DEFAULT 0');

  addColumnIfMissing(db, 'leave_balances', 'maternity_entitlement', 'REAL NOT NULL DEFAULT 0');
  addColumnIfMissing(db, 'leave_balances', 'maternity_used', 'REAL NOT NULL DEFAULT 0');
  addColumnIfMissing(db, 'leave_balances', 'paternity_entitlement', 'REAL NOT NULL DEFAULT 0');
  addColumnIfMissing(db, 'leave_balances', 'paternity_used', 'REAL NOT NULL DEFAULT 0');

  db.exec(`
    CREATE TABLE IF NOT EXISTS attendance_scan_log (
      id TEXT PRIMARY KEY,
      identifier TEXT NOT NULL,
      identifier_type TEXT NOT NULL,
      site_id TEXT NOT NULL,
      outcome TEXT NOT NULL,
      employee_name TEXT,
      details TEXT NOT NULL,
      timestamp TEXT NOT NULL
    );
  `);

  addColumnIfMissing(db, 'attendance', 'late_minutes', 'INTEGER NOT NULL DEFAULT 0');
  addColumnIfMissing(db, 'attendance', 'overtime_hours', 'REAL NOT NULL DEFAULT 0');

  db.exec(`
    CREATE TABLE IF NOT EXISTS hr_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS leave_balances (
      employee_id TEXT PRIMARY KEY,
      annual_entitlement REAL NOT NULL DEFAULT 20,
      sick_entitlement REAL NOT NULL DEFAULT 10,
      annual_used REAL NOT NULL DEFAULT 0,
      sick_used REAL NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS holidays (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      date TEXT NOT NULL,
      recurring INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS employee_notes (
      id TEXT PRIMARY KEY,
      employee_id TEXT NOT NULL,
      note TEXT NOT NULL,
      created_at TEXT NOT NULL,
      created_by TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS employee_documents (
      id TEXT PRIMARY KEY,
      employee_id TEXT NOT NULL,
      name TEXT NOT NULL,
      file_name TEXT NOT NULL,
      file_data TEXT NOT NULL,
      uploaded_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS audit_log (
      id TEXT PRIMARY KEY,
      action TEXT NOT NULL,
      entity TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      details TEXT NOT NULL,
      user_name TEXT NOT NULL,
      timestamp TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS hr_notifications (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      read INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      link_page TEXT
    );
    CREATE TABLE IF NOT EXISTS message_templates (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      subject TEXT NOT NULL,
      body TEXT NOT NULL
    );
  `);

  seedDefaultSettings(db);
  seedDefaultTemplates(db);
  seedDefaultHolidays(db);
  seedLeaveBalances(db);

  const phoneBackfill: Record<string, string> = {
    'Sarah Mitchell': '(555) 201-0001',
    'James Chen': '(555) 201-0002',
    'Emily Rodriguez': '(555) 201-0003',
    'Michael Thompson': '(555) 201-0004',
    'Lisa Park': '(555) 201-0005',
    'David Wilson': '(555) 201-0006',
    'Anna Kowalski': '(555) 201-0007',
    'Robert Garcia': '(555) 201-0008',
  };
  const updatePhone = db.prepare('UPDATE employees SET phone = ? WHERE name = ? AND (phone = \'\' OR phone IS NULL)');
  for (const [name, phone] of Object.entries(phoneBackfill)) {
    updatePhone.run(phone, name);
  }
}

function seedDefaultSettings(db: DbClient): void {
  const defaults: Record<string, string> = {
    orgName: 'STRATERA R&D Software Group',
    workHours: '8',
    payrollCycle: 'monthly',
    payrollDeductionRate: '22',
    payrollDeductionFixed: '0',
    leaveApproval: 'manager',
    attendanceGrace: '15',
    emailLeaveRequests: 'true',
    emailPayroll: 'true',
    emailAttendance: 'false',
    smtpEnabled: 'false',
    smtpHost: '',
    smtpPort: '587',
    smtpUser: '',
    smtpPassword: '',
    smtpFrom: '',
    sessionTimeoutMinutes: '30',
    currency: 'USD',
    leaveAnnualDays: '15',
    leaveUndergroundDays: '21',
    leaveSickDays: '12',
    leavePaternityDays: '5',
    leaveMaternityDays: '84',
    leaveSeniorityYears: '5',
    leaveSeniorityBonusDays: '3',
    leaveSickMedicalCertDays: '2',
    checkInSiteName: 'Main Office',
    checkInSiteToken: '',
  };
  const insert = db.prepare(sqlInsertIgnore(db.engine, 'hr_settings', ['key', 'value'], 'key'));
  for (const [key, value] of Object.entries(defaults)) {
    insert.run(key, value);
  }
}

function seedDefaultTemplates(db: DbClient): void {
  const count = db.prepare('SELECT COUNT(*) as count FROM message_templates').get() as { count: number };
  if (count.count > 0) return;
  const insert = db.prepare(
    'INSERT INTO message_templates (id, name, type, subject, body) VALUES (?, ?, ?, ?, ?)',
  );
  insert.run(
    'TPL-001',
    'Policy Update',
    'Announcement',
    'Important Policy Update',
    'Please review the updated company policy. Contact HR if you have questions.',
  );
  insert.run(
    'TPL-002',
    'Holiday Notice',
    'Notice',
    'Upcoming Company Holiday',
    'Please note the upcoming company holiday. Plan your work accordingly.',
  );
  insert.run(
    'TPL-003',
    'Payroll Reminder',
    'Reminder',
    'Payroll Processing Reminder',
    'Monthly payroll will be processed soon. Ensure your records are up to date.',
  );
}

function seedDefaultHolidays(db: DbClient): void {
  const count = db.prepare('SELECT COUNT(*) as count FROM holidays').get() as { count: number };
  if (count.count > 0) return;
  const insert = db.prepare('INSERT INTO holidays (id, name, date, recurring) VALUES (?, ?, ?, ?)');
  insert.run('HOL-001', 'New Year\'s Day', '2026-01-01', 1);
  insert.run('HOL-002', 'Independence Day', '2026-07-04', 1);
  insert.run('HOL-003', 'Christmas Day', '2026-12-25', 1);
}

function seedLeaveBalances(db: DbClient): void {
  const employees = db.prepare('SELECT id FROM employees').all() as { id: string }[];
  const insert = db.prepare(
    sqlInsertIgnore(
      db.engine,
      'leave_balances',
      [
        'employee_id',
        'annual_entitlement',
        'sick_entitlement',
        'annual_used',
        'sick_used',
        'maternity_entitlement',
        'maternity_used',
        'paternity_entitlement',
        'paternity_used',
      ],
      'employee_id',
    ),
  );
  for (const emp of employees) insert.run(emp.id, 15, 12, 0, 0, 0, 0, 0, 0);
}
