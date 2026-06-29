export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  app_access TEXT NOT NULL DEFAULT 'both',
  must_change_credentials INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS accounts (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  balance REAL NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD'
);

CREATE TABLE IF NOT EXISTS transactions (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL,
  description TEXT NOT NULL,
  account TEXT NOT NULL,
  type TEXT NOT NULL,
  amount REAL NOT NULL,
  status TEXT NOT NULL DEFAULT 'Completed'
);

CREATE TABLE IF NOT EXISTS invoices (
  id TEXT PRIMARY KEY,
  client TEXT NOT NULL,
  date TEXT NOT NULL,
  due_date TEXT NOT NULL,
  amount REAL NOT NULL,
  status TEXT NOT NULL DEFAULT 'Draft'
);

CREATE TABLE IF NOT EXISTS employees (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  department TEXT NOT NULL,
  role TEXT NOT NULL,
  email TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Active',
  join_date TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS payroll (
  id TEXT PRIMARY KEY,
  employee TEXT NOT NULL,
  department TEXT NOT NULL,
  base_salary REAL NOT NULL,
  bonus REAL NOT NULL DEFAULT 0,
  deductions REAL NOT NULL DEFAULT 0,
  net_pay REAL NOT NULL,
  status TEXT NOT NULL DEFAULT 'Pending',
  transaction_id TEXT,
  processed_date TEXT
);

CREATE TABLE IF NOT EXISTS attendance (
  id TEXT PRIMARY KEY,
  employee TEXT NOT NULL,
  date TEXT NOT NULL,
  check_in TEXT NOT NULL,
  check_out TEXT NOT NULL,
  hours REAL NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'Present'
);

CREATE TABLE IF NOT EXISTS leave_requests (
  id TEXT PRIMARY KEY,
  employee TEXT NOT NULL,
  type TEXT NOT NULL,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  days INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'Pending',
  reason TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS departments (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  head TEXT NOT NULL,
  employees INTEGER NOT NULL DEFAULT 0,
  budget REAL NOT NULL DEFAULT 0
);

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
`;
