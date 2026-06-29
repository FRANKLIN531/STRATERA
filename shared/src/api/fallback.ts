import type {
  AccountingApi,
  HrApi,
  User,
  SmtpConfig,
  AccountingDashboardStats,
  Account,
  Transaction,
  Invoice,
  HrDashboardStats,
  Employee,
  PayrollRecord,
  AttendanceRecord,
  LeaveRequest,
  Department,
  CreateTransactionInput,
  CreateInvoiceInput,
  CreateEmployeeInput,
  CreateLeaveInput,
  CreateDepartmentInput,
  CreateJobPositionInput,
  CreateAttendanceInput,
  UpdateSalaryInput,
  SendMessageInput,
  SendMessageResult,
  SendMessageFailure,
  JobPosition,
  EmployeeMessage,
  PayrollRunPreview,
  PayrollRunResult,
  EmployeePayrollStatus,
  HrSettings,
} from './types';
import {
  isValidEmail,
  isValidPhone,
  isWorkEmail,
  normalizeEmail,
  normalizePhone,
  hasKnownTypoInDomain,
} from '../utils/validation';
import { setActiveCurrency } from '../utils/currency';

const INVALID_DOMAINS = new Set([
  'gmail.comm', 'gmail.comn', 'gmial.com', 'gmai.com', 'gmaill.com', 'gmaiil.com',
  'yahoo.comm', 'outlook.comm',
]);

function hasTypoDomain(domain: string): boolean {
  return hasKnownTypoInDomain(domain) || INVALID_DOMAINS.has(domain.toLowerCase());
}

let mockUser: User | null = null;
let verifiedCredentialEmail: string | null = null;

const DEV_SMTP_KEY = 'stratera-dev-smtp';
const DEV_USERS_KEY = 'stratera-dev-users';
const DEV_VERIFIED_EMAIL_KEY = 'stratera-verified-credential-email';
const DEV_DEPARTMENTS_KEY = 'stratera-dev-departments';
const DEV_HR_SETTINGS_KEY = 'stratera-dev-hr-settings';

function defaultHrSettings(): HrSettings {
  return {
    orgName: 'STRATERA R&D Software Group',
    workHours: '8',
    payrollCycle: 'monthly',
    payrollDeductionRate: '22',
    payrollDeductionFixed: '0',
    leaveApproval: 'manager',
    attendanceGrace: '15',
    emailLeaveRequests: true,
    emailPayroll: true,
    emailAttendance: false,
    smtpEnabled: false,
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
  };
}

function loadStoredHrSettings(): Partial<HrSettings> {
  try {
    const raw = localStorage.getItem(DEV_HR_SETTINGS_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Partial<HrSettings>;
  } catch {
    return {};
  }
}

function storeHrSettings(settings: HrSettings) {
  try {
    localStorage.setItem(DEV_HR_SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    /* ignore */
  }
}

function resolveHrSettings(overrides?: Partial<HrSettings>): HrSettings {
  const smtp = readStoredSmtp();
  const stored = loadStoredHrSettings();
  const base = { ...defaultHrSettings(), ...stored, ...overrides };
  const resolved = smtp
    ? {
        ...base,
        smtpEnabled: true,
        smtpHost: smtp.host,
        smtpPort: smtp.port,
        smtpUser: smtp.user,
        smtpPassword: smtp.password,
        smtpFrom: smtp.from,
      }
    : base;
  setActiveCurrency(resolved.currency ?? 'USD');
  return resolved;
}

function readStoredSmtp(): SmtpConfig | undefined {
  try {
    const raw = localStorage.getItem(DEV_SMTP_KEY);
    if (!raw) return undefined;
    return JSON.parse(raw) as SmtpConfig;
  } catch {
    return undefined;
  }
}

function storeSmtp(smtp: SmtpConfig) {
  try {
    localStorage.setItem(DEV_SMTP_KEY, JSON.stringify(smtp));
  } catch {
    /* ignore */
  }
}

function loadStoredDemoUsers(): Record<string, { password: string; user: User }> {
  try {
    const raw = localStorage.getItem(DEV_USERS_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, { password: string; user: User }>;
  } catch {
    return {};
  }
}

function storeDemoUser(email: string, entry: { password: string; user: User }) {
  try {
    const stored = loadStoredDemoUsers();
    stored[email] = entry;
    localStorage.setItem(DEV_USERS_KEY, JSON.stringify(stored));
  } catch {
    /* ignore */
  }
}

function loadStoredDepartments(): Department[] {
  try {
    const raw = localStorage.getItem(DEV_DEPARTMENTS_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as Department[];
  } catch {
    return [];
  }
}

function storeDepartments(list: Department[]) {
  try {
    localStorage.setItem(DEV_DEPARTMENTS_KEY, JSON.stringify(list));
  } catch {
    /* ignore */
  }
}

function removeStoredDemoUser(email: string) {
  try {
    const stored = loadStoredDemoUsers();
    delete stored[email];
    localStorage.setItem(DEV_USERS_KEY, JSON.stringify(stored));
  } catch {
    /* ignore */
  }
}

/** Drop stale browser dev data after a database reset (keeps default demo logins only). */
function clearStaleDevBrowserCaches() {
  try {
    localStorage.removeItem(DEV_SMTP_KEY);
    localStorage.removeItem(DEV_USERS_KEY);
    localStorage.removeItem(DEV_VERIFIED_EMAIL_KEY);
    sessionStorage.removeItem('stratera-credential-verified-email');
  } catch {
    /* ignore */
  }
  verifiedCredentialEmail = null;
  for (const key of Object.keys(DEMO_USERS)) {
    if (!DEFAULT_DEMO_USERS[key]) {
      delete DEMO_USERS[key];
    }
  }
}

async function devSendPasswordReset(email: string, smtp?: SmtpConfig) {
  const res = await fetch('/__stratera/dev/send-password-reset', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, smtp }),
  });
  const text = await res.text();
  try {
    return JSON.parse(text) as { ok: boolean; error?: string };
  } catch {
    return {
      ok: false,
      error: text?.slice(0, 120) || `Could not reach dev server (${res.status}). Restart start-stratera.bat.`,
    };
  }
}

async function devCompletePasswordReset(email: string, code: string, newPassword: string) {
  const res = await fetch('/__stratera/dev/complete-password-reset', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, code, newPassword }),
  });
  return res.json() as Promise<{ ok: boolean; error?: string }>;
}

async function devSendVerification(email: string, smtp: SmtpConfig) {
  const res = await fetch('/__stratera/dev/send-verification', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, smtp }),
  });
  return res.json() as Promise<{ ok: boolean; error?: string }>;
}

async function devVerifyCode(email: string, code: string) {
  const res = await fetch('/__stratera/dev/verify-code', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, code }),
  });
  return res.json() as Promise<{ ok: boolean; error?: string; verifiedEmail?: string }>;
}

const DEFAULT_DEMO_USERS: Record<string, { password: string; user: User }> = {
  'admin@stratera.com': {
    password: 'admin123',
    user: { id: 'USR-001', email: 'admin@stratera.com', name: 'System Admin', role: 'Admin', appAccess: 'both' },
  },
  'accountant@stratera.com': {
    password: 'account123',
    user: { id: 'USR-002', email: 'accountant@stratera.com', name: 'Michael Thompson', role: 'Accountant', appAccess: 'accounting' },
  },
  'hr@stratera.com': {
    password: 'hr123',
    user: { id: 'USR-003', email: 'hr@stratera.com', name: 'Emily Rodriguez', role: 'HR Manager', appAccess: 'hr' },
  },
};

const DEMO_USERS: Record<string, { password: string; user: User }> = {
  ...DEFAULT_DEMO_USERS,
  ...(typeof localStorage !== 'undefined' ? loadStoredDemoUsers() : {}),
};

async function devSendEmployeeMessage(payload: {
  to: string;
  employeeName: string;
  subject: string;
  body: string;
  sentBy: string;
  type?: string;
  smtp?: SmtpConfig;
}) {
  const res = await fetch('/__stratera/dev/send-employee-message', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const text = await res.text();
  try {
    return JSON.parse(text) as { ok: boolean; error?: string };
  } catch {
    return {
      ok: false,
      error: text?.slice(0, 120) || `Could not reach dev server (${res.status}). Restart start-stratera.bat.`,
    };
  }
}

function authApi(requiredApp: 'accounting' | 'hr'): Pick<AccountingApi, 'login' | 'logout' | 'getCurrentUser' | 'isInitialSetupPending' | 'sendPasswordResetCode' | 'completePasswordResetWithCode' | 'completeCredentialUpdate' | 'sendCredentialEmailVerification' | 'verifyCredentialEmailCode' | 'verifyPassword'> {
  return {
    login: async (email, password, module) => {
      const normalized = normalizeEmail(email);
      if (!isValidEmail(normalized)) return null;
      const entry = DEMO_USERS[normalized];
      if (!entry || entry.password !== password) return null;
      const target = module ?? requiredApp;
      if (entry.user.appAccess !== 'both' && entry.user.appAccess !== target) return null;
      const requiresCredentialUpdate =
        entry.user.role === 'Admin' && password === 'admin123';
      mockUser = { ...entry.user, requiresCredentialUpdate };
      return mockUser;
    },
    logout: async () => {
      mockUser = null;
      return true;
    },
    getCurrentUser: async () => mockUser,
    isInitialSetupPending: async () => !!DEMO_USERS['admin@stratera.com'],
    sendPasswordResetCode: async (email) => {
      const normalized = normalizeEmail(email);
      if (!isValidEmail(normalized)) return { ok: false, error: 'This email address is invalid.' };
      if (window.stratera?.isElectron) {
        return { ok: false, error: 'Database not connected. Restart STRATERA.' };
      }
      const smtp = readStoredSmtp();
      try {
        const result = await devSendPasswordReset(normalized, smtp);
        return result ?? { ok: false, error: 'Could not send reset code.' };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return {
          ok: false,
          error: msg || 'Could not reach STRATERA dev server. Restart start-stratera.bat.',
        };
      }
    },
    completePasswordResetWithCode: async (email, code, newPassword) => {
      const normalized = normalizeEmail(email);
      if (!isValidEmail(normalized)) return { ok: false, error: 'This email address is invalid.' };
      if (newPassword.length < 6) return { ok: false, error: 'Password must be at least 6 characters.' };
      const entry = DEMO_USERS[normalized];
      if (!entry) return { ok: false, error: 'Invalid reset code or email address.' };
      if (window.stratera?.isElectron) {
        return { ok: false, error: 'Database not connected. Restart STRATERA.' };
      }
      try {
        const result = await devCompletePasswordReset(normalized, code, newPassword);
        if (result.ok) {
          entry.password = newPassword;
          storeDemoUser(normalized, entry);
        }
        return result;
      } catch {
        return { ok: false, error: 'Could not reset password. Restart start-stratera.bat.' };
      }
    },
    completeCredentialUpdate: async (email, newPassword) => {
      if (!mockUser) {
        throw new Error('Session expired. Sign in again and continue account setup.');
      }
      const normalized = normalizeEmail(email);
      const verified =
        verifiedCredentialEmail ?? localStorage.getItem(DEV_VERIFIED_EMAIL_KEY) ?? undefined;
      if (verified !== normalized) {
        throw new Error('Please verify your email address before continuing.');
      }
      if (!isWorkEmail(normalized)) {
        throw new Error('This email address is invalid.');
      }
      const domain = normalized.split('@')[1];
      if (hasTypoDomain(domain)) {
        throw new Error('This email domain does not exist.');
      }
      if (newPassword.length < 6) {
        throw new Error('Password must be at least 6 characters.');
      }
      if (newPassword === 'admin123') {
        throw new Error('Choose a new password — the default password cannot be used.');
      }
      const conflict = Object.values(DEMO_USERS).find(
        (entry) => entry.user.id !== mockUser!.id && normalizeEmail(entry.user.email) === normalized,
      );
      if (conflict) {
        throw new Error('An account with that email already exists.');
      }
      const oldEntry = DEMO_USERS[mockUser.email];
      if (oldEntry) {
        delete DEMO_USERS[mockUser.email];
        removeStoredDemoUser(mockUser.email);
        oldEntry.password = newPassword;
        oldEntry.user = { ...oldEntry.user, email: normalized, requiresCredentialUpdate: false };
        DEMO_USERS[normalized] = oldEntry;
        storeDemoUser(normalized, oldEntry);
      }
      mockUser = { ...mockUser, email: normalized, requiresCredentialUpdate: false };
      verifiedCredentialEmail = null;
      localStorage.removeItem(DEV_VERIFIED_EMAIL_KEY);
      try {
        sessionStorage.removeItem('stratera-credential-verified-email');
      } catch {
        /* ignore */
      }
      return mockUser;
    },
    sendCredentialEmailVerification: async (email, smtp) => {
      if (!mockUser) {
        return { ok: false, error: 'Not signed in.' };
      }
      const normalized = normalizeEmail(email);
      const conflict = Object.values(DEMO_USERS).find(
        (entry) => entry.user.id !== mockUser!.id && normalizeEmail(entry.user.email) === normalized,
      );
      if (conflict) {
        return { ok: false, error: 'An account with that email already exists.' };
      }
      if (window.stratera?.isElectron) {
        return { ok: false, error: 'Database not connected. Restart STRATERA.' };
      }
      try {
        const result = await devSendVerification(email, smtp);
        if (result.ok) storeSmtp(smtp);
        return result;
      } catch {
        return { ok: false, error: 'Could not reach STRATERA dev server. Restart start-stratera.bat.' };
      }
    },
    verifyCredentialEmailCode: async (email, code) => {
      if (window.stratera?.isElectron) {
        return { ok: false, error: 'Database not connected. Restart STRATERA.' };
      }
      try {
        const result = await devVerifyCode(email, code);
        if (result.ok && result.verifiedEmail) {
          verifiedCredentialEmail = result.verifiedEmail;
          localStorage.setItem(DEV_VERIFIED_EMAIL_KEY, result.verifiedEmail);
          return { ok: true };
        }
        return { ok: false, error: result.error ?? 'Invalid verification code.' };
      } catch {
        return { ok: false, error: 'Could not verify code. Restart start-stratera.bat.' };
      }
    },
    verifyPassword: async (password) => {
      if (!mockUser) {
        return { ok: false, error: 'You must be signed in to continue.' };
      }
      if (!password.trim()) {
        return { ok: false, error: 'Enter your password to continue.' };
      }
      const entry = DEMO_USERS[mockUser.email];
      if (!entry || entry.password !== password) {
        return { ok: false, error: 'Incorrect password.' };
      }
      return { ok: true };
    },
  };
}

const accountingStats: AccountingDashboardStats = {
  totalRevenue: 512000,
  totalExpenses: 287600,
  netProfit: 224400,
  outstandingInvoices: 30750,
  pendingInvoiceCount: 2,
  revenueChange: '+12.5% from last month',
  expenseChange: '+3.2% from last month',
  profitChange: '+18.7% from last month',
};

const accounts: Account[] = [
  { id: 'ACC-001', name: 'Cash & Bank', type: 'Asset', balance: 245800, currency: 'USD' },
  { id: 'ACC-002', name: 'Accounts Receivable', type: 'Asset', balance: 89400, currency: 'USD' },
  { id: 'ACC-003', name: 'Inventory', type: 'Asset', balance: 156200, currency: 'USD' },
  { id: 'ACC-004', name: 'Accounts Payable', type: 'Liability', balance: 42300, currency: 'USD' },
  { id: 'ACC-005', name: 'Revenue', type: 'Income', balance: 512000, currency: 'USD' },
  { id: 'ACC-006', name: 'Operating Expenses', type: 'Expense', balance: 287600, currency: 'USD' },
];

const transactions: Transaction[] = [
  { id: 'TXN-1042', date: '2026-06-12', description: 'Client payment - Apex Corp', account: 'Accounts Receivable', type: 'Income', amount: 12500, status: 'Completed' },
  { id: 'TXN-1041', date: '2026-06-11', description: 'Office supplies purchase', account: 'Operating Expenses', type: 'Expense', amount: -890, status: 'Completed' },
  { id: 'TXN-1040', date: '2026-06-11', description: 'Software license renewal', account: 'Operating Expenses', type: 'Expense', amount: -2400, status: 'Completed' },
  { id: 'TXN-1039', date: '2026-06-10', description: 'Invoice #INV-2026-089', account: 'Revenue', type: 'Income', amount: 8750, status: 'Completed' },
  { id: 'TXN-1038', date: '2026-06-10', description: 'Vendor payment - TechSupply', account: 'Accounts Payable', type: 'Expense', amount: -5600, status: 'Pending' },
];

const invoices: Invoice[] = [
  { id: 'INV-2026-092', client: 'Apex Corporation', date: '2026-06-12', dueDate: '2026-07-12', amount: 12500, status: 'Paid' },
  { id: 'INV-2026-091', client: 'NovaTech Solutions', date: '2026-06-10', dueDate: '2026-07-10', amount: 8750, status: 'Sent' },
  { id: 'INV-2026-090', client: 'Global Dynamics', date: '2026-06-08', dueDate: '2026-07-08', amount: 22000, status: 'Overdue' },
];

function computeHrDashboardStats(): HrDashboardStats {
  const today = new Date().toISOString().slice(0, 10);
  const quarterStart = (() => {
    const d = new Date();
    const qMonth = Math.floor(d.getMonth() / 3) * 3;
    return new Date(d.getFullYear(), qMonth, 1).toISOString().slice(0, 10);
  })();
  const activeEmployees = employees.filter((e) => e.status !== 'Terminated');
  const totalEmployees = activeEmployees.length;
  const onLeave = activeEmployees.filter((e) => e.status === 'On Leave').length;
  const presentToday = attendance.filter((a) => a.date === today && a.status === 'Present').length;
  const pendingRequests = leaveRequests.filter((l) => l.status === 'Pending').length;
  const newThisQuarter = activeEmployees.filter((e) => e.joinDate >= quarterStart).length;
  const attendanceRate =
    totalEmployees > 0 ? `${((presentToday / totalEmployees) * 100).toFixed(1)}% attendance rate` : '0%';
  return {
    totalEmployees,
    presentToday,
    onLeave,
    pendingRequests,
    attendanceRate,
    newThisQuarter,
  };
}

const employees: Employee[] = [];

const jobPositions: JobPosition[] = [];

const employeeMessages: EmployeeMessage[] = [];

const payroll: PayrollRecord[] = [];

function calcFallbackDeductions(gross: number): number {
  const settings = resolveHrSettings();
  const rate = Math.max(0, parseFloat(settings.payrollDeductionRate || '22') || 0) / 100;
  const fixed = Math.max(0, parseFloat(settings.payrollDeductionFixed || '0') || 0);
  return Math.round(gross * rate + fixed);
}

function fallbackPayStatuses(): EmployeePayrollStatus[] {
  const today = new Date().toISOString().slice(0, 10);
  return employees
    .filter((e) => e.status !== 'Terminated')
    .map((emp) => {
      const pending = payroll.find((p) => p.employee === emp.name && p.status === 'Pending');
      const last = payroll
        .filter((p) => p.employee === emp.name && p.status === 'Processed' && p.processedDate)
        .sort((a, b) => (b.processedDate ?? '').localeCompare(a.processedDate ?? ''))[0];
      const gross = emp.salary + (pending?.bonus ?? 0);
      const deductions = calcFallbackDeductions(gross);
      let status: EmployeePayrollStatus['status'] = 'due';
      if (pending) status = 'pending';
      else if (last?.processedDate) {
        const lastPaid = new Date(`${last.processedDate}T12:00:00`);
        const nextDue = new Date(lastPaid);
        nextDue.setMonth(nextDue.getMonth() + 1);
        status = new Date(`${today}T12:00:00`) >= nextDue ? 'due' : 'paid';
      } else if (new Date(`${emp.joinDate}T12:00:00`) > new Date(`${today}T12:00:00`)) {
        status = 'paid';
      }

      const nextDueDate = last?.processedDate
        ? (() => {
            const d = new Date(`${last.processedDate}T12:00:00`);
            d.setMonth(d.getMonth() + 1);
            return d.toISOString().slice(0, 10);
          })()
        : emp.joinDate;

      return {
        employeeId: emp.id,
        employeeName: emp.name,
        status,
        lastPaidDate: last?.processedDate,
        nextDueDate,
        estimatedNetPay: gross - deductions,
        estimatedDeductions: deductions,
      };
    });
}

const attendance: AttendanceRecord[] = [];

const leaveRequests: LeaveRequest[] = [];

const departments: Department[] =
  typeof localStorage !== 'undefined' ? loadStoredDepartments() : [];

export function createAccountingFallbackApi(): AccountingApi {
  const auth = authApi('accounting');
  return {
    ...auth,
    getDashboardStats: async () => accountingStats,
    getAccounts: async () => accounts,
    getTransactions: async () => transactions,
    getInvoices: async () => invoices,
    createTransaction: async (input: CreateTransactionInput) => {
      const amount = input.type === 'Expense' ? -Math.abs(input.amount) : Math.abs(input.amount);
      const txn: Transaction = {
        id: `TXN-${String(transactions.length + 1043).padStart(4, '0')}`,
        date: input.date,
        description: input.description,
        account: input.account,
        type: input.type,
        amount,
        status: input.status ?? 'Completed',
      };
      transactions.unshift(txn);
      const acc = accounts.find((a) => a.name === input.account);
      if (acc) acc.balance += Math.abs(input.amount);
      return txn;
    },
    createInvoice: async (input: CreateInvoiceInput) => {
      const inv: Invoice = {
        id: `INV-2026-${String(invoices.length + 93).padStart(3, '0')}`,
        client: input.client,
        date: input.date,
        dueDate: input.dueDate,
        amount: input.amount,
        status: input.status ?? 'Draft',
      };
      invoices.unshift(inv);
      return inv;
    },
    updateTransaction: async (id, input) => {
      const idx = transactions.findIndex((t) => t.id === id);
      if (idx < 0 || transactions[idx].description.startsWith('Payroll -')) return null;
      const old = transactions[idx];
      const accOld = accounts.find((a) => a.name === old.account);
      if (accOld) accOld.balance -= Math.abs(old.amount);
      const amount = input.type === 'Expense' ? -Math.abs(input.amount) : Math.abs(input.amount);
      transactions[idx] = { ...old, ...input, amount, status: input.status ?? 'Completed' };
      const accNew = accounts.find((a) => a.name === input.account);
      if (accNew) accNew.balance += Math.abs(input.amount);
      return transactions[idx];
    },
    deleteTransaction: async (id) => {
      const idx = transactions.findIndex((t) => t.id === id);
      if (idx < 0 || transactions[idx].description.startsWith('Payroll -')) return false;
      const old = transactions[idx];
      const acc = accounts.find((a) => a.name === old.account);
      if (acc) acc.balance -= Math.abs(old.amount);
      transactions.splice(idx, 1);
      return true;
    },
    updateInvoice: async (id, input) => {
      const inv = invoices.find((i) => i.id === id);
      if (!inv) return null;
      Object.assign(inv, input, { status: input.status ?? inv.status });
      return inv;
    },
    deleteInvoice: async (id) => {
      const idx = invoices.findIndex((i) => i.id === id);
      if (idx < 0) return false;
      invoices.splice(idx, 1);
      return true;
    },
    emailInvoice: async (invoice) => {
      const amount = invoice.amount.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
      const subject = encodeURIComponent(`STRATERA Invoice ${invoice.id}`);
      const body = encodeURIComponent(
        `Dear ${invoice.client},\n\nInvoice ${invoice.id} for ${amount}.\nDue: ${invoice.dueDate}\n\nSTRATERA R&D Software Group`,
      );
      window.open(`mailto:?subject=${subject}&body=${body}`);
      return true;
    },
  };
}

export function createHrFallbackApi(): HrApi {
  const auth = authApi('hr');
  return {
    ...auth,
    getDashboardStats: async () => computeHrDashboardStats(),
    getEmployees: async () => employees,
    getPayroll: async () => payroll,
    getAttendance: async () => attendance,
    getLeaveRequests: async () => leaveRequests,
    getDepartments: async () => departments,
    getJobPositions: async () => jobPositions,
    getMessages: async () => employeeMessages,
    createEmployee: async (input: CreateEmployeeInput) => {
      const email = normalizeEmail(input.email);
      const phone = normalizePhone(input.phone);
      if (!isValidEmail(email)) throw new Error('Invalid employee email address.');
      if (!isValidPhone(phone)) throw new Error('Invalid employee phone number.');
      const emp: Employee = {
        id: `EMP-${String(employees.length + 1).padStart(3, '0')}`,
        name: input.name,
        department: input.department,
        role: input.department,
        email,
        phone,
        status: 'Active',
        joinDate: input.joinDate,
        salary: input.salary,
      };
      employees.push(emp);
      const dept = departments.find((d) => d.name === input.department);
      if (dept) dept.employees += 1;
      return emp;
    },
    updateEmployee: async (id, input) => {
      const email = normalizeEmail(input.email);
      const phone = normalizePhone(input.phone);
      if (!isValidEmail(email)) throw new Error('Invalid employee email address.');
      if (!isValidPhone(phone)) throw new Error('Invalid employee phone number.');
      const emp = employees.find((e) => e.id === id);
      if (!emp) return null;
      if (emp.department !== input.department) {
        const oldDept = departments.find((d) => d.name === emp.department);
        const newDept = departments.find((d) => d.name === input.department);
        if (oldDept) oldDept.employees -= 1;
        if (newDept) newDept.employees += 1;
      }
      Object.assign(emp, { ...input, email, phone, role: input.department });
      return emp;
    },
    deleteEmployee: async (id) => {
      const idx = employees.findIndex((e) => e.id === id);
      if (idx < 0) return false;
      const dept = departments.find((d) => d.name === employees[idx].department);
      if (dept) dept.employees -= 1;
      employees.splice(idx, 1);
      return true;
    },
    updateEmployeeSalary: async (input: UpdateSalaryInput) => {
      const emp = employees.find((e) => e.id === input.employeeId);
      if (!emp) return null;
      emp.salary = input.baseSalary;
      const bonus = input.bonus ?? 0;
      const pending = payroll.find((p) => p.employee === emp.name && p.status === 'Pending');
      if (pending) {
        pending.baseSalary = input.baseSalary;
        pending.bonus = bonus;
        const gross = input.baseSalary + bonus;
        pending.deductions = Math.round(gross * 0.22);
        pending.netPay = gross - pending.deductions;
      }
      return emp;
    },
    createDepartment: async (input: CreateDepartmentInput) => {
      const name = input.name?.trim();
      if (!name) throw new Error('Department name is required.');
      const dept: Department = {
        id: `DEPT-${String(departments.length + 1).padStart(2, '0')}`,
        name,
        head: '',
        employees: 0,
        budget: input.budget ?? 0,
      };
      departments.push(dept);
      storeDepartments(departments);
      return dept;
    },
    updateDepartment: async (id, input) => {
      const dept = departments.find((d) => d.id === id);
      if (!dept) return null;
      const name = input.name?.trim();
      if (!name) throw new Error('Department name is required.');
      Object.assign(dept, { ...input, name });
      storeDepartments(departments);
      return dept;
    },
    deleteDepartment: async (id) => {
      const idx = departments.findIndex((d) => d.id === id);
      if (idx < 0 || departments[idx].employees > 0) return false;
      departments.splice(idx, 1);
      storeDepartments(departments);
      return true;
    },
    createJobPosition: async (input: CreateJobPositionInput) => {
      const pos: JobPosition = {
        id: `POS-${String(jobPositions.length + 1).padStart(3, '0')}`,
        title: input.title,
        department: input.department,
        level: input.level,
        minSalary: input.minSalary,
        maxSalary: input.maxSalary,
      };
      jobPositions.push(pos);
      return pos;
    },
    updateJobPosition: async (id, input) => {
      const pos = jobPositions.find((p) => p.id === id);
      if (!pos) return null;
      Object.assign(pos, input);
      return pos;
    },
    deleteJobPosition: async (id) => {
      const linked = employees.some((e) => e.positionId === id);
      if (linked) return false;
      const idx = jobPositions.findIndex((p) => p.id === id);
      if (idx < 0) return false;
      jobPositions.splice(idx, 1);
      return true;
    },
    createAttendance: async (input: CreateAttendanceInput) => {
      const record: AttendanceRecord = {
        id: `ATT-${String(attendance.length + 1).padStart(3, '0')}`,
        employee: input.employee,
        date: input.date,
        checkIn: input.checkIn,
        checkOut: input.checkOut,
        hours: input.hours,
        status: input.status,
      };
      attendance.unshift(record);
      return record;
    },
    updateAttendance: async (id, input) => {
      const record = attendance.find((a) => a.id === id);
      if (!record) return null;
      Object.assign(record, input);
      return record;
    },
    deleteAttendance: async (id) => {
      const idx = attendance.findIndex((a) => a.id === id);
      if (idx < 0) return false;
      attendance.splice(idx, 1);
      return true;
    },
    sendEmployeeMessage: async (input: SendMessageInput): Promise<SendMessageResult> => {
      const smtp = readStoredSmtp();
      const sentBy = mockUser?.name ?? 'HR Administrator';
      const sentAt = new Date().toISOString();
      const messages: EmployeeMessage[] = [];
      const failures: SendMessageFailure[] = [];
      const recipientIds = [...new Set(input.employeeIds)];

      for (const empId of recipientIds) {
        const emp = employees.find((e) => e.id === empId);
        if (!emp) continue;
        const email = normalizeEmail(emp.email);
        if (!isValidEmail(email)) {
          failures.push({
            employee: emp.name,
            email,
            error: 'Invalid email address on employee record.',
          });
          continue;
        }

        try {
          const result = await devSendEmployeeMessage({
            to: email,
            employeeName: emp.name,
            subject: input.subject,
            body: input.body,
            sentBy,
            type: input.type,
            smtp,
          });
          if (!result.ok) {
            failures.push({
              employee: emp.name,
              email,
              error: result.error ?? `Could not email ${emp.name}.`,
            });
            await new Promise((resolve) => setTimeout(resolve, 400));
            continue;
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          failures.push({
            employee: emp.name,
            email,
            error: msg || 'Could not reach STRATERA dev server. Restart start-stratera.bat.',
          });
          await new Promise((resolve) => setTimeout(resolve, 400));
          continue;
        }

        const msg: EmployeeMessage = {
          id: `MSG-${String(employeeMessages.length + messages.length + 1).padStart(3, '0')}`,
          employee: emp.name,
          employeeEmail: email,
          subject: input.subject,
          body: input.body,
          type: input.type,
          sentAt,
          sentBy,
          status: 'Sent',
        };
        employeeMessages.unshift(msg);
        messages.push(msg);
        await new Promise((resolve) => setTimeout(resolve, 400));
      }

      if (messages.length === 0 && failures.length > 0) {
        const summary = failures.map((f) => `${f.employee} (${f.error})`).join(' ');
        throw new Error(`Could not send to any employee. ${summary}`);
      }

      return { messages, failures };
    },
    deleteMessage: async (id) => {
      const idx = employeeMessages.findIndex((m) => m.id === id);
      if (idx < 0) return false;
      employeeMessages.splice(idx, 1);
      return true;
    },
    deleteMessages: async (ids) => {
      const idSet = new Set(ids);
      const before = employeeMessages.length;
      for (let i = employeeMessages.length - 1; i >= 0; i -= 1) {
        if (idSet.has(employeeMessages[i].id)) {
          employeeMessages.splice(i, 1);
        }
      }
      return before - employeeMessages.length;
    },
    deleteAllMessages: async () => {
      const count = employeeMessages.length;
      employeeMessages.length = 0;
      return count;
    },
    createLeaveRequest: async (input: CreateLeaveInput) => {
      const leave: LeaveRequest = {
        id: `LV-${String(leaveRequests.length + 43).padStart(3, '0')}`,
        employee: input.employee,
        type: input.type,
        startDate: input.startDate,
        endDate: input.endDate,
        days: input.days,
        status: 'Pending',
        reason: input.reason,
      };
      leaveRequests.unshift(leave);
      return leave;
    },
    updateLeaveRequest: async (id, input) => {
      const leave = leaveRequests.find((l) => l.id === id);
      if (!leave || leave.status !== 'Pending') return null;
      Object.assign(leave, input);
      return leave;
    },
    deleteLeaveRequest: async (id) => {
      const idx = leaveRequests.findIndex((l) => l.id === id);
      if (idx < 0 || leaveRequests[idx].status !== 'Pending') return false;
      leaveRequests.splice(idx, 1);
      return true;
    },
    updateLeaveStatus: async (id, status) => {
      const leave = leaveRequests.find((l) => l.id === id);
      if (!leave) return null;
      leave.status = status;
      if (status === 'Approved') {
        const emp = employees.find((e) => e.name === leave.employee);
        if (emp) emp.status = 'On Leave';
      }
      return leave;
    },
    cancelLeaveRequest: async (id) => {
      const leave = leaveRequests.find((l) => l.id === id);
      if (!leave || leave.status === 'Rejected' || leave.status === 'Cancelled') return null;
      if (leave.status === 'Approved') {
        const emp = employees.find((e) => e.name === leave.employee);
        if (emp && emp.status === 'On Leave') emp.status = 'Active';
      }
      leave.status = 'Cancelled';
      leave.approvalStage = 'Cancelled';
      return leave;
    },
    getPayrollRunPreview: async (): Promise<PayrollRunPreview> => {
      const pending = payroll.filter((p) => p.status === 'Pending');
      const period = new Date().toISOString().slice(0, 7);
      return {
        period,
        pendingCount: pending.length,
        employeesToGenerate: 0,
        totalGross: pending.reduce((s, p) => s + p.baseSalary + p.bonus, 0),
        totalNet: pending.reduce((s, p) => s + p.netPay, 0),
        records: pending,
      };
    },
    processPayroll: async (id) => {
      const record = payroll.find((p) => p.id === id);
      if (!record || record.status === 'Processed') return null;
      const txnId = `TXN-PAY-${Date.now()}`;
      record.status = 'Processed';
      record.transactionId = txnId;
      record.processedDate = new Date().toISOString().slice(0, 10);
      return { payroll: { ...record }, transactionId: txnId };
    },
    runPayrollAndSync: async (): Promise<PayrollRunResult> => {
      const pending = payroll.filter((p) => p.status === 'Pending');
      const transactionIds: string[] = [];
      let totalGross = 0;
      let totalNet = 0;
      const today = new Date().toISOString().slice(0, 10);
      for (const p of pending) {
        const txnId = `TXN-PAY-${p.id}`;
        p.status = 'Processed';
        p.transactionId = txnId;
        p.processedDate = today;
        transactionIds.push(txnId);
        totalGross += p.baseSalary + p.bonus;
        totalNet += p.netPay;
      }
      return {
        generated: 0,
        processed: transactionIds.length,
        totalGross,
        totalNet,
        transactionIds,
      };
    },
    getEmployeePayrollStatuses: async () => fallbackPayStatuses(),
    payEmployee: async (employeeId) => {
      const emp = employees.find((e) => e.id === employeeId);
      if (!emp) return { error: 'Employee not found.' };
      const status = fallbackPayStatuses().find((s) => s.employeeId === employeeId);
      if (status?.status === 'paid') {
        return { error: `Not due for payment yet. Next pay date: ${status.nextDueDate}.` };
      }
      let record = payroll.find((p) => p.employee === emp.name && p.status === 'Pending');
      if (!record) {
        const gross = emp.salary;
        const deductions = calcFallbackDeductions(gross);
        record = {
          id: `PAY-${emp.id}-${Date.now()}`,
          employee: emp.name,
          department: emp.department,
          baseSalary: emp.salary,
          bonus: 0,
          deductions,
          netPay: gross - deductions,
          status: 'Pending',
        };
        payroll.unshift(record);
      }
      const txnId = `TXN-PAY-${record.id}`;
      record.status = 'Processed';
      record.transactionId = txnId;
      record.processedDate = new Date().toISOString().slice(0, 10);
      return { payroll: { ...record }, transactionId: txnId };
    },
    getSettings: async () => resolveHrSettings(),
    updateSettings: async (input) => {
      const settings = resolveHrSettings(input);
      storeHrSettings(settings);
      if (settings.smtpHost && settings.smtpUser && settings.smtpPassword && settings.smtpFrom) {
        storeSmtp({
          host: settings.smtpHost,
          port: settings.smtpPort,
          user: settings.smtpUser,
          password: settings.smtpPassword,
          from: settings.smtpFrom,
        });
      }
      return settings;
    },
    getLeaveBalances: async () =>
      employees.map((e) => ({
        employeeId: e.id,
        employeeName: e.name,
        annualEntitlement: 15,
        sickEntitlement: 12,
        annualUsed: 0,
        sickUsed: 0,
        annualRemaining: 15,
        sickRemaining: 12,
        maternityEntitlement: e.gender === 'Female' ? 84 : 0,
        maternityUsed: 0,
        maternityRemaining: e.gender === 'Female' ? 84 : 0,
        paternityEntitlement: e.gender === 'Male' ? 5 : 0,
        paternityUsed: 0,
        paternityRemaining: e.gender === 'Male' ? 5 : 0,
        onProbation: Boolean(e.probationEndDate && e.probationEndDate >= new Date().toISOString().slice(0, 10)),
        canTakeLeave: !(e.probationEndDate && e.probationEndDate >= new Date().toISOString().slice(0, 10)),
      })),
    updateLeaveBalance: async (input) => ({
      employeeId: input.employeeId,
      employeeName: employees.find((e) => e.id === input.employeeId)?.name ?? '',
      annualEntitlement: input.annualEntitlement,
      sickEntitlement: input.sickEntitlement,
      annualUsed: input.annualUsed ?? 0,
      sickUsed: input.sickUsed ?? 0,
      annualRemaining: input.annualEntitlement - (input.annualUsed ?? 0),
      sickRemaining: input.sickEntitlement - (input.sickUsed ?? 0),
      maternityEntitlement: input.maternityEntitlement ?? 0,
      maternityUsed: input.maternityUsed ?? 0,
      maternityRemaining: (input.maternityEntitlement ?? 0) - (input.maternityUsed ?? 0),
      paternityEntitlement: input.paternityEntitlement ?? 0,
      paternityUsed: input.paternityUsed ?? 0,
      paternityRemaining: (input.paternityEntitlement ?? 0) - (input.paternityUsed ?? 0),
    }),
    getHolidays: async () => [
      { id: 'HOL-001', name: 'New Year\'s Day', date: '2026-01-01', recurring: true },
      { id: 'HOL-002', name: 'Christmas Day', date: '2026-12-25', recurring: true },
    ],
    createHoliday: async (input) => ({ id: `HOL-${Date.now()}`, ...input }),
    deleteHoliday: async () => true,
    getEmployeeNotes: async () => [],
    createEmployeeNote: async (input) => ({
      id: `NOTE-${Date.now()}`,
      employeeId: input.employeeId,
      note: input.note,
      createdAt: new Date().toISOString(),
      createdBy: mockUser?.name ?? 'HR',
    }),
    deleteEmployeeNote: async () => true,
    getEmployeeDocuments: async () => [],
    addEmployeeDocument: async (input) => ({
      id: `DOC-${Date.now()}`,
      employeeId: input.employeeId,
      name: input.name,
      fileName: input.fileName,
      uploadedAt: new Date().toISOString(),
    }),
    getEmployeeDocumentData: async () => null,
    deleteEmployeeDocument: async () => true,
    getAuditLog: async () => [],
    deleteAllAuditLog: async (password) => {
      if (!mockUser) {
        return { ok: false, error: 'You must be signed in to delete audit entries.' };
      }
      const entry = DEMO_USERS[mockUser.email];
      if (!entry || entry.password !== password) {
        return { ok: false, error: 'Incorrect password. Audit log was not changed.' };
      }
      return { ok: true, deleted: 0 };
    },
    getNotifications: async () => [],
    markNotificationRead: async () => true,
    markAllNotificationsRead: async () => true,
    getMessageTemplates: async () => [
      { id: 'TPL-001', name: 'Policy Update', type: 'Announcement', subject: 'Policy Update', body: 'Please review the updated policy.' },
    ],
    createMessageTemplate: async (input) => ({ id: `TPL-${Date.now()}`, ...input }),
    deleteMessageTemplate: async () => true,
    getAttendanceTrends: async () => [
      { week: '2026-06-01', presentRate: 92, totalHours: 320 },
      { week: '2026-06-08', presentRate: 88, totalHours: 310 },
    ],
    getDepartmentCostReport: async () =>
      departments.map((d) => ({
        department: d.name,
        employeeCount: d.employees,
        totalSalary: employees.filter((e) => e.department === d.name).reduce((s, e) => s + e.salary, 0),
        budget: d.budget,
        payrollThisMonth: payroll.filter((p) => p.department === d.name).reduce((s, p) => s + p.netPay, 0),
      })),
    getAccountingSyncStatus: async () =>
      payroll.slice(0, 10).map((p) => ({
        payrollId: p.id,
        employee: p.employee,
        amount: p.netPay,
        status: p.status,
        transactionId: p.transactionId,
        processedDate: p.processedDate,
      })),
    terminateEmployee: async (input) => {
      const emp = employees.find((e) => e.id === input.employeeId);
      if (!emp) return false;
      emp.status = 'Terminated';
      emp.endDate = input.endDate ?? new Date().toISOString().slice(0, 10);
      emp.terminationReason = input.reason;
      return true;
    },
    approveLeaveManager: async (id) => {
      const leave = leaveRequests.find((l) => l.id === id);
      if (!leave) return null;
      leave.approvalStage = 'Pending HR';
      leave.managerApproved = true;
      return leave;
    },
    approveLeaveHr: async (id) => {
      const leave = leaveRequests.find((l) => l.id === id);
      if (!leave) return null;
      leave.status = 'Approved';
      leave.approvalStage = 'Approved';
      const emp = employees.find((e) => e.name === leave.employee);
      if (emp) emp.status = 'On Leave';
      return leave;
    },
    syncLeaveStatuses: async () => 0,
    clockIn: async (name) => {
      const now = new Date().toTimeString().slice(0, 5);
      const localToday = (() => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      })();
      const dateKeys = new Set([localToday, new Date().toISOString().slice(0, 10)]);
      const normalized = name.trim().toLowerCase();
      const todayRecords = attendance.filter(
        (a) => a.employee.trim().toLowerCase() === normalized && dateKeys.has(a.date),
      );
      const hasCheckIn = (value: string | undefined) => {
        const s = String(value ?? '').trim();
        return s.length > 0 && s !== '—' && s !== '-';
      };
      if (todayRecords.some((a) => hasCheckIn(a.checkIn))) {
        throw new Error(`${name} has already clocked in.`);
      }
      const existing = todayRecords.find((a) => !hasCheckIn(a.checkIn));
      if (existing) {
        existing.checkIn = now;
        existing.status = 'Present';
        return existing;
      }
      const record: AttendanceRecord = {
        id: `ATT-CLK-${Date.now()}`,
        employee: name,
        date: localToday,
        checkIn: now,
        checkOut: '—',
        hours: 0,
        status: 'Present',
      };
      attendance.unshift(record);
      return record;
    },
    clockOut: async (name) => {
      const localToday = (() => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      })();
      const dateKeys = new Set([localToday, new Date().toISOString().slice(0, 10)]);
      const normalized = name.trim().toLowerCase();
      const todayRecords = attendance.filter(
        (a) => a.employee.trim().toLowerCase() === normalized && dateKeys.has(a.date),
      );
      const hasCheckIn = (value: string | undefined) => {
        const s = String(value ?? '').trim();
        return s.length > 0 && s !== '—' && s !== '-';
      };
      const hasCheckOut = (value: string | undefined) => {
        const s = String(value ?? '').trim();
        return s.length > 0 && s !== '—' && s !== '-';
      };
      if (!todayRecords.some((a) => hasCheckIn(a.checkIn))) {
        throw new Error(`${name} has not clocked in yet.`);
      }
      const record = todayRecords.find((a) => hasCheckIn(a.checkIn) && !hasCheckOut(a.checkOut));
      if (!record) {
        throw new Error(`${name} has already clocked out.`);
      }
      record.checkOut = new Date().toTimeString().slice(0, 5);
      const [inH, inM] = record.checkIn.split(':').map(Number);
      const [outH, outM] = record.checkOut.split(':').map(Number);
      record.hours = Math.max(0, Math.round(((outH * 60 + outM - inH * 60 - inM) / 60) * 10) / 10);
      return record;
    },
    importAttendanceCsv: async () => 0,
    exportHrBackup: async () => JSON.stringify({ exportedAt: new Date().toISOString(), tables: {} }),
    importHrBackup: async () => true,
    getKioskCheckInConfig: async (baseUrl) => {
      const origin = baseUrl.replace(/\/$/, '') || 'http://localhost:5190';
      const token = 'DEV-KIOSK-TOKEN';
      return {
        siteId: 'Main Office',
        siteName: 'Main Office',
        siteToken: token,
        checkInUrl: `${origin}/check-in?site=${encodeURIComponent(token)}`,
      };
    },
    regenerateCheckInSiteToken: async (baseUrl) => {
      const origin = baseUrl.replace(/\/$/, '') || 'http://localhost:5190';
      return {
        siteId: 'Main Office',
        siteName: 'Main Office',
        siteToken: 'DEV-KIOSK-TOKEN',
        checkInUrl: `${origin}/check-in?site=${encodeURIComponent('DEV-KIOSK-TOKEN')}`,
      };
    },
    lookupCheckIn: async (input) => {
      if (input.siteToken !== 'DEV-KIOSK-TOKEN') {
        return { ok: false, error: 'Invalid check-in link. Scan the QR code at your office.' };
      }
      const phone = input.phone?.trim();
      const email = input.email?.trim();
      if (!phone && !email) return { ok: false, error: 'Enter your phone number or email.' };

      const digits = (v: string) => v.replace(/\D/g, '').slice(-10);
      let emp = employees.find((e) => {
        if (email) return normalizeEmail(e.email) === normalizeEmail(email);
        return digits(e.phone) === digits(phone!);
      });

      if (!emp) {
        return { ok: false, error: 'We could not find you in STRATERA. Contact HR to be added as an employee.' };
      }
      if (emp.status === 'Terminated') {
        return { ok: false, error: 'Your employment record is not active. Contact HR.' };
      }
      if (emp.status === 'On Leave') {
        return { ok: false, error: 'You are marked as on leave today. Contact HR if this is wrong.' };
      }

      const localToday = new Date().toISOString().slice(0, 10);
      const todayRows = attendance.filter((a) => a.employee === emp!.name && a.date === localToday);
      const hasIn = (t: string) => t && t !== '—';
      const hasOut = (t: string) => t && t !== '—';
      let action: 'check_in' | 'check_out' = 'check_in';
      if (todayRows.some((a) => hasIn(a.checkIn) && !hasOut(a.checkOut))) action = 'check_out';
      if (todayRows.some((a) => hasIn(a.checkIn) && hasOut(a.checkOut))) {
        return { ok: false, error: 'You have already checked in and out today.' };
      }

      return {
        ok: true,
        employee: { id: emp.id, name: emp.name, department: emp.department },
        action,
        message: action === 'check_in' ? 'Ready to check in for today.' : 'You are checked in. Ready to check out.',
      };
    },
    confirmCheckIn: async (input) => {
      if (input.siteToken !== 'DEV-KIOSK-TOKEN') {
        return { ok: false, error: 'Invalid check-in link.' };
      }
      const emp = employees.find((e) => e.id === input.employeeId);
      if (!emp) return { ok: false, error: 'Employee not found.' };
      try {
        let record: AttendanceRecord;
        if (input.action === 'check_in') {
          record = await (async () => {
            const now = new Date().toTimeString().slice(0, 5);
            const localToday = new Date().toISOString().slice(0, 10);
            const todayRecords = attendance.filter((a) => a.employee === emp.name && a.date === localToday);
            const hasCheckIn = (v: string) => v && v !== '—';
            if (todayRecords.some((a) => hasCheckIn(a.checkIn))) {
              throw new Error(`${emp.name} has already clocked in.`);
            }
            const existing = todayRecords.find((a) => !hasCheckIn(a.checkIn));
            if (existing) {
              existing.checkIn = now;
              existing.status = 'Present';
              return existing;
            }
            const row: AttendanceRecord = {
              id: `ATT-CLK-${Date.now()}`,
              employee: emp.name,
              date: localToday,
              checkIn: now,
              checkOut: '—',
              hours: 0,
              status: 'Present',
            };
            attendance.unshift(row);
            return row;
          })();
        } else {
          record = await (async () => {
            const localToday = new Date().toISOString().slice(0, 10);
            const todayRecords = attendance.filter((a) => a.employee === emp.name && a.date === localToday);
            const hasCheckIn = (v: string) => v && v !== '—';
            const hasCheckOut = (v: string) => v && v !== '—';
            if (!todayRecords.some((a) => hasCheckIn(a.checkIn))) {
              throw new Error(`${emp.name} has not clocked in yet.`);
            }
            const row = todayRecords.find((a) => hasCheckIn(a.checkIn) && !hasCheckOut(a.checkOut));
            if (!row) throw new Error(`${emp.name} has already clocked out.`);
            row.checkOut = new Date().toTimeString().slice(0, 5);
            const [inH, inM] = row.checkIn.split(':').map(Number);
            const [outH, outM] = row.checkOut.split(':').map(Number);
            row.hours = Math.max(0, Math.round(((outH * 60 + outM - inH * 60 - inM) / 60) * 10) / 10);
            return row;
          })();
        }
        return {
          ok: true,
          action: input.action,
          employeeName: emp.name,
          time: input.action === 'check_in' ? record.checkIn : record.checkOut,
          message:
            input.action === 'check_in'
              ? `Checked in at ${record.checkIn}. Have a great day!`
              : `Checked out at ${record.checkOut}. See you tomorrow!`,
        };
      } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : 'Could not record attendance.' };
      }
    },
    getAttendanceScanLog: async () => [],
  };
}
