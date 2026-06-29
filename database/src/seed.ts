import { createHash } from 'crypto';
import type { DbClient } from './db-client';

function hashPassword(password: string): string {
  return createHash('sha256').update(password).digest('hex');
}

export function seedDatabase(db: DbClient): void {
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
  if (userCount.count > 0) return;

  const insertUser = db.prepare(
    'INSERT INTO users (id, email, password_hash, name, role, app_access, must_change_credentials) VALUES (?, ?, ?, ?, ?, ?, ?)',
  );

  insertUser.run('USR-001', 'admin@stratera.com', hashPassword('admin123'), 'System Admin', 'Admin', 'both', 1);
  insertUser.run('USR-002', 'accountant@stratera.com', hashPassword('account123'), 'Michael Thompson', 'Accountant', 'accounting', 0);
  insertUser.run('USR-003', 'hr@stratera.com', hashPassword('hr123'), 'Emily Rodriguez', 'HR Manager', 'hr', 0);

  const accounts = [
    ['ACC-001', 'Cash & Bank', 'Asset', 245800, 'USD'],
    ['ACC-002', 'Accounts Receivable', 'Asset', 89400, 'USD'],
    ['ACC-003', 'Inventory', 'Asset', 156200, 'USD'],
    ['ACC-004', 'Accounts Payable', 'Liability', 42300, 'USD'],
    ['ACC-005', 'Revenue', 'Income', 512000, 'USD'],
    ['ACC-006', 'Operating Expenses', 'Expense', 287600, 'USD'],
  ];
  const insertAccount = db.prepare('INSERT INTO accounts (id, name, type, balance, currency) VALUES (?, ?, ?, ?, ?)');
  for (const a of accounts) insertAccount.run(...a);

  const transactions = [
    ['TXN-1042', '2026-06-12', 'Client payment - Apex Corp', 'Accounts Receivable', 'Income', 12500, 'Completed'],
    ['TXN-1041', '2026-06-11', 'Office supplies purchase', 'Operating Expenses', 'Expense', -890, 'Completed'],
    ['TXN-1040', '2026-06-11', 'Software license renewal', 'Operating Expenses', 'Expense', -2400, 'Completed'],
    ['TXN-1039', '2026-06-10', 'Invoice #INV-2026-089', 'Revenue', 'Income', 8750, 'Completed'],
    ['TXN-1038', '2026-06-10', 'Vendor payment - TechSupply', 'Accounts Payable', 'Expense', -5600, 'Pending'],
    ['TXN-1037', '2026-06-09', 'Consulting services', 'Revenue', 'Income', 15000, 'Completed'],
    ['TXN-1036', '2026-06-09', 'Utility bill payment', 'Operating Expenses', 'Expense', -1250, 'Completed'],
    ['TXN-1035', '2026-06-08', 'Bank transfer received', 'Cash & Bank', 'Income', 32000, 'Completed'],
  ];
  const insertTxn = db.prepare(
    'INSERT INTO transactions (id, date, description, account, type, amount, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
  );
  for (const t of transactions) insertTxn.run(...t);

  const invoices = [
    ['INV-2026-092', 'Apex Corporation', '2026-06-12', '2026-07-12', 12500, 'Paid'],
    ['INV-2026-091', 'NovaTech Solutions', '2026-06-10', '2026-07-10', 8750, 'Sent'],
    ['INV-2026-090', 'Global Dynamics', '2026-06-08', '2026-07-08', 22000, 'Overdue'],
    ['INV-2026-089', 'Summit Industries', '2026-06-05', '2026-07-05', 6500, 'Paid'],
    ['INV-2026-088', 'Blue Horizon Ltd', '2026-06-03', '2026-07-03', 15800, 'Draft'],
  ];
  const insertInvoice = db.prepare(
    'INSERT INTO invoices (id, client, date, due_date, amount, status) VALUES (?, ?, ?, ?, ?, ?)',
  );
  for (const i of invoices) insertInvoice.run(...i);

  const employees = [
    ['EMP-001', 'Sarah Mitchell', 'Engineering', 'Senior Developer', 'sarah.mitchell@stratera.com', 'Active', '2022-03-15'],
    ['EMP-002', 'James Chen', 'Engineering', 'Tech Lead', 'james.chen@stratera.com', 'Active', '2021-08-01'],
    ['EMP-003', 'Emily Rodriguez', 'Human Resources', 'HR Manager', 'emily.rodriguez@stratera.com', 'Active', '2020-11-20'],
    ['EMP-004', 'Michael Thompson', 'Finance', 'Accountant', 'michael.thompson@stratera.com', 'Active', '2023-01-10'],
    ['EMP-005', 'Lisa Park', 'Design', 'UI/UX Designer', 'lisa.park@stratera.com', 'Active', '2022-06-22'],
    ['EMP-006', 'David Wilson', 'Engineering', 'Junior Developer', 'david.wilson@stratera.com', 'On Leave', '2024-02-14'],
    ['EMP-007', 'Anna Kowalski', 'Marketing', 'Marketing Specialist', 'anna.kowalski@stratera.com', 'Active', '2023-09-05'],
    ['EMP-008', 'Robert Garcia', 'Operations', 'Operations Manager', 'robert.garcia@stratera.com', 'Active', '2019-04-18'],
  ];
  const insertEmployee = db.prepare(
    'INSERT INTO employees (id, name, department, role, email, status, join_date) VALUES (?, ?, ?, ?, ?, ?, ?)',
  );
  for (const e of employees) insertEmployee.run(...e);

  const payroll = [
    ['PAY-2026-06', 'Sarah Mitchell', 'Engineering', 8500, 1200, 1850, 7850, 'Processed'],
    ['PAY-2026-05', 'James Chen', 'Engineering', 10200, 2000, 2240, 9960, 'Processed'],
    ['PAY-2026-04', 'Emily Rodriguez', 'Human Resources', 7800, 800, 1680, 6920, 'Processed'],
    ['PAY-2026-03', 'Michael Thompson', 'Finance', 6500, 500, 1400, 5600, 'Pending'],
    ['PAY-2026-02', 'Lisa Park', 'Design', 7200, 900, 1560, 6240, 'Processed'],
    ['PAY-2026-01', 'Anna Kowalski', 'Marketing', 5800, 400, 1240, 4960, 'Processed'],
  ];
  const insertPayroll = db.prepare(
    'INSERT INTO payroll (id, employee, department, base_salary, bonus, deductions, net_pay, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
  );
  for (const p of payroll) insertPayroll.run(...p);

  const attendance = [
    ['ATT-001', 'Sarah Mitchell', '2026-06-12', '08:55', '17:30', 8.5, 'Present'],
    ['ATT-002', 'James Chen', '2026-06-12', '09:10', '18:00', 8.8, 'Present'],
    ['ATT-003', 'Emily Rodriguez', '2026-06-12', '08:45', '17:15', 8.5, 'Present'],
    ['ATT-004', 'David Wilson', '2026-06-12', '-', '-', 0, 'On Leave'],
    ['ATT-005', 'Michael Thompson', '2026-06-12', '08:30', '17:00', 8.5, 'Present'],
    ['ATT-006', 'Lisa Park', '2026-06-12', '09:00', '17:45', 8.75, 'Present'],
    ['ATT-007', 'Anna Kowalski', '2026-06-12', '08:50', '17:20', 8.5, 'Present'],
  ];
  const insertAttendance = db.prepare(
    'INSERT INTO attendance (id, employee, date, check_in, check_out, hours, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
  );
  for (const a of attendance) insertAttendance.run(...a);

  const leaves = [
    ['LV-042', 'David Wilson', 'Sick Leave', '2026-06-10', '2026-06-14', 5, 'Approved', 'Medical recovery'],
    ['LV-041', 'Sarah Mitchell', 'Annual Leave', '2026-07-01', '2026-07-15', 15, 'Pending', 'Summer vacation'],
    ['LV-040', 'Anna Kowalski', 'Personal Leave', '2026-06-20', '2026-06-21', 2, 'Pending', 'Family event'],
    ['LV-039', 'Robert Garcia', 'Annual Leave', '2026-05-28', '2026-06-02', 6, 'Approved', 'Personal travel'],
    ['LV-038', 'Lisa Park', 'Sick Leave', '2026-05-15', '2026-05-16', 2, 'Approved', 'Illness'],
  ];
  const insertLeave = db.prepare(
    'INSERT INTO leave_requests (id, employee, type, start_date, end_date, days, status, reason) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
  );
  for (const l of leaves) insertLeave.run(...l);

  const departments = [
    ['DEPT-01', 'Engineering', 'James Chen', 12, 1450000],
    ['DEPT-02', 'Human Resources', 'Emily Rodriguez', 4, 320000],
    ['DEPT-03', 'Finance', 'Michael Thompson', 5, 480000],
    ['DEPT-04', 'Design', 'Lisa Park', 6, 540000],
    ['DEPT-05', 'Marketing', 'Anna Kowalski', 4, 380000],
    ['DEPT-06', 'Operations', 'Robert Garcia', 8, 620000],
  ];
  const insertDept = db.prepare(
    'INSERT INTO departments (id, name, head, employees, budget) VALUES (?, ?, ?, ?, ?)',
  );
  for (const d of departments) insertDept.run(...d);
}

export { hashPassword };
