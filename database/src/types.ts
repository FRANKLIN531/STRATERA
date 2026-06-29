export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  appAccess: 'accounting' | 'hr' | 'both';
  requiresCredentialUpdate?: boolean;
}

export interface Account {
  id: string;
  name: string;
  type: string;
  balance: number;
  currency: string;
}

export interface Transaction {
  id: string;
  date: string;
  description: string;
  account: string;
  type: string;
  amount: number;
  status: string;
}

export interface Invoice {
  id: string;
  client: string;
  date: string;
  dueDate: string;
  amount: number;
  status: string;
}

export interface AccountingDashboardStats {
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  outstandingInvoices: number;
  pendingInvoiceCount: number;
  revenueChange: string;
  expenseChange: string;
  profitChange: string;
}

export interface Employee {
  id: string;
  name: string;
  department: string;
  role: string;
  email: string;
  phone: string;
  status: string;
  joinDate: string;
  salary: number;
  positionId?: string;
  positionTitle?: string;
  birthDate?: string;
  endDate?: string;
  terminationReason?: string;
  gender?: string;
  employmentType?: string;
  workHoursRatio?: number;
  undergroundMining?: boolean;
  probationEndDate?: string;
}

export interface JobPosition {
  id: string;
  title: string;
  department: string;
  level: string;
  minSalary: number;
  maxSalary: number;
}

export interface EmployeeMessage {
  id: string;
  employee: string;
  employeeEmail: string;
  subject: string;
  body: string;
  type: string;
  sentAt: string;
  sentBy: string;
  status: string;
}

export interface PayrollRecord {
  id: string;
  employee: string;
  department: string;
  baseSalary: number;
  bonus: number;
  deductions: number;
  netPay: number;
  status: string;
  transactionId?: string;
  processedDate?: string;
}

export type EmployeePayrollStatusKind = 'paid' | 'pending' | 'due';

export interface EmployeePayrollStatus {
  employeeId: string;
  employeeName: string;
  status: EmployeePayrollStatusKind;
  lastPaidDate?: string;
  nextDueDate: string;
  estimatedNetPay: number;
  estimatedDeductions: number;
}

export interface PayrollRunPreview {
  period: string;
  pendingCount: number;
  employeesToGenerate: number;
  totalGross: number;
  totalNet: number;
  records: PayrollRecord[];
}

export interface PayrollRunResult {
  generated: number;
  processed: number;
  totalGross: number;
  totalNet: number;
  transactionIds: string[];
}

export interface AttendanceRecord {
  id: string;
  employee: string;
  date: string;
  checkIn: string;
  checkOut: string;
  hours: number;
  status: string;
  lateMinutes?: number;
  overtimeHours?: number;
}

export interface AttendanceScanLogEntry {
  id: string;
  identifier: string;
  identifierType: 'phone' | 'email';
  siteId: string;
  outcome: string;
  employeeName?: string;
  details: string;
  timestamp: string;
}

export interface KioskCheckInConfig {
  siteId: string;
  siteName: string;
  siteToken: string;
  checkInUrl: string;
}

export interface CheckInLookupInput {
  siteToken: string;
  phone?: string;
  email?: string;
}

export type CheckInAction = 'check_in' | 'check_out';

export interface CheckInLookupResult {
  ok: boolean;
  error?: string;
  employee?: { id: string; name: string; department: string };
  action?: CheckInAction;
  message?: string;
}

export interface CheckInConfirmInput {
  siteToken: string;
  employeeId: string;
  action: CheckInAction;
}

export interface CheckInConfirmResult {
  ok: boolean;
  error?: string;
  action?: CheckInAction;
  employeeName?: string;
  time?: string;
  message?: string;
}

export interface LeaveRequest {
  id: string;
  employee: string;
  type: string;
  startDate: string;
  endDate: string;
  days: number;
  status: string;
  reason: string;
  approvalStage?: string;
  managerApproved?: boolean;
  medicalCertificateProvided?: boolean;
}

export interface Department {
  id: string;
  name: string;
  head: string;
  employees: number;
  budget: number;
}

export interface HrDashboardStats {
  totalEmployees: number;
  presentToday: number;
  onLeave: number;
  pendingRequests: number;
  attendanceRate: string;
  newThisQuarter: number;
  attendanceTrends?: AttendanceTrend[];
  celebrations?: Celebration[];
  unreadNotifications?: number;
}

export interface SmtpConfig {
  host: string;
  port: string;
  user: string;
  password: string;
  from: string;
}

export interface HrSettings {
  orgName: string;
  workHours: string;
  payrollCycle: string;
  payrollDeductionRate: string;
  payrollDeductionFixed: string;
  leaveApproval: string;
  attendanceGrace: string;
  emailLeaveRequests: boolean;
  emailPayroll: boolean;
  emailAttendance: boolean;
  smtpEnabled: boolean;
  smtpHost: string;
  smtpPort: string;
  smtpUser: string;
  smtpPassword: string;
  smtpFrom: string;
  sessionTimeoutMinutes: string;
  currency: string;
  leaveAnnualDays: string;
  leaveUndergroundDays: string;
  leaveSickDays: string;
  leavePaternityDays: string;
  leaveMaternityDays: string;
  leaveSeniorityYears: string;
  leaveSeniorityBonusDays: string;
  leaveSickMedicalCertDays: string;
}

export interface LeaveBalance {
  employeeId: string;
  employeeName: string;
  annualEntitlement: number;
  sickEntitlement: number;
  annualUsed: number;
  sickUsed: number;
  annualRemaining: number;
  sickRemaining: number;
  maternityEntitlement: number;
  maternityUsed: number;
  maternityRemaining: number;
  paternityEntitlement: number;
  paternityUsed: number;
  paternityRemaining: number;
  onProbation?: boolean;
  canTakeLeave?: boolean;
}

export interface Holiday {
  id: string;
  name: string;
  date: string;
  recurring: boolean;
}

export interface EmployeeNote {
  id: string;
  employeeId: string;
  note: string;
  createdAt: string;
  createdBy: string;
}

export interface EmployeeDocument {
  id: string;
  employeeId: string;
  name: string;
  fileName: string;
  uploadedAt: string;
}

export interface AuditLogEntry {
  id: string;
  action: string;
  entity: string;
  entityId: string;
  details: string;
  userName: string;
  timestamp: string;
}

export interface HrNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  linkPage?: string;
}

export interface MessageTemplate {
  id: string;
  name: string;
  type: string;
  subject: string;
  body: string;
}

export interface AttendanceTrend {
  week: string;
  presentRate: number;
  totalHours: number;
}

export interface DepartmentCostReport {
  department: string;
  employeeCount: number;
  totalSalary: number;
  budget: number;
  payrollThisMonth: number;
}

export interface Celebration {
  employeeId: string;
  employeeName: string;
  type: 'birthday' | 'anniversary';
  date: string;
  years?: number;
}

export interface AccountingSyncStatus {
  payrollId: string;
  employee: string;
  amount: number;
  status: string;
  transactionId?: string;
  processedDate?: string;
}

export interface HrNavState {
  filter?: string;
  statusFilter?: string;
  departmentFilter?: string;
  dateFrom?: string;
  dateTo?: string;
  employeeId?: string;
  search?: string;
}

export interface CreateTransactionInput {
  date: string;
  description: string;
  account: string;
  type: 'Income' | 'Expense';
  amount: number;
  status?: string;
}

export interface CreateInvoiceInput {
  client: string;
  date: string;
  dueDate: string;
  amount: number;
  status?: string;
}

export interface CreateEmployeeInput {
  name: string;
  department: string;
  email: string;
  phone: string;
  joinDate: string;
  salary: number;
  role?: string;
  positionId?: string;
  birthDate?: string;
  gender?: string;
  employmentType?: string;
  workHoursRatio?: number;
  undergroundMining?: boolean;
  probationEndDate?: string;
}

export interface CreateDepartmentInput {
  name: string;
  budget?: number;
}

export interface CreateJobPositionInput {
  title: string;
  department: string;
  level: string;
  minSalary: number;
  maxSalary: number;
}

export interface CreateAttendanceInput {
  employee: string;
  date: string;
  checkIn: string;
  checkOut: string;
  hours: number;
  status: string;
}

export interface UpdateSalaryInput {
  employeeId: string;
  baseSalary: number;
  bonus?: number;
}

export interface SendMessageInput {
  employeeIds: string[];
  subject: string;
  body: string;
  type: string;
}

export interface SendMessageFailure {
  employee: string;
  email: string;
  error: string;
}

export interface SendMessageResult {
  messages: EmployeeMessage[];
  failures: SendMessageFailure[];
}

export interface CreateLeaveInput {
  employee: string;
  type: string;
  startDate: string;
  endDate: string;
  days: number;
  reason: string;
  medicalCertificateProvided?: boolean;
}

export interface CreateHolidayInput {
  name: string;
  date: string;
  recurring: boolean;
}

export interface CreateEmployeeNoteInput {
  employeeId: string;
  note: string;
}

export interface CreateDocumentInput {
  employeeId: string;
  name: string;
  fileName: string;
  fileData: string;
}

export interface CreateMessageTemplateInput {
  name: string;
  type: string;
  subject: string;
  body: string;
}

export interface UpdateLeaveBalanceInput {
  employeeId: string;
  annualEntitlement: number;
  sickEntitlement: number;
  annualUsed?: number;
  sickUsed?: number;
  maternityEntitlement?: number;
  maternityUsed?: number;
  paternityEntitlement?: number;
  paternityUsed?: number;
  adjustmentReason: string;
}

export interface TerminateEmployeeInput {
  employeeId: string;
  reason: string;
  endDate?: string;
}

export interface AuthApi {
  login: (email: string, password: string, module: 'accounting' | 'hr') => Promise<User | null>;
  logout: () => Promise<boolean>;
  getCurrentUser: () => Promise<User | null>;
  isInitialSetupPending: () => Promise<boolean>;
  sendPasswordResetCode: (email: string) => Promise<{ ok: boolean; error?: string }>;
  completePasswordResetWithCode: (
    email: string,
    code: string,
    newPassword: string,
  ) => Promise<{ ok: boolean; error?: string }>;
  completeCredentialUpdate: (email: string, newPassword: string) => Promise<User | null>;
  sendCredentialEmailVerification: (
    email: string,
    smtp: SmtpConfig,
  ) => Promise<{ ok: boolean; error?: string }>;
  verifyCredentialEmailCode: (email: string, code: string) => Promise<{ ok: boolean; error?: string }>;
}

export interface AccountingApi extends AuthApi {
  getDashboardStats: () => Promise<AccountingDashboardStats>;
  getAccounts: () => Promise<Account[]>;
  getTransactions: () => Promise<Transaction[]>;
  getInvoices: () => Promise<Invoice[]>;
  createTransaction: (input: CreateTransactionInput) => Promise<Transaction>;
  createInvoice: (input: CreateInvoiceInput) => Promise<Invoice>;
  updateTransaction: (id: string, input: CreateTransactionInput) => Promise<Transaction | null>;
  deleteTransaction: (id: string) => Promise<boolean>;
  updateInvoice: (id: string, input: CreateInvoiceInput) => Promise<Invoice | null>;
  deleteInvoice: (id: string) => Promise<boolean>;
  emailInvoice: (invoice: Invoice) => Promise<boolean>;
}

export interface HrApi extends AuthApi {
  getDashboardStats: () => Promise<HrDashboardStats>;
  getEmployees: () => Promise<Employee[]>;
  getPayroll: () => Promise<PayrollRecord[]>;
  getAttendance: () => Promise<AttendanceRecord[]>;
  getLeaveRequests: () => Promise<LeaveRequest[]>;
  getDepartments: () => Promise<Department[]>;
  getJobPositions: () => Promise<JobPosition[]>;
  getMessages: () => Promise<EmployeeMessage[]>;
  createEmployee: (input: CreateEmployeeInput) => Promise<Employee>;
  updateEmployee: (id: string, input: CreateEmployeeInput) => Promise<Employee | null>;
  deleteEmployee: (id: string) => Promise<boolean>;
  updateEmployeeSalary: (input: UpdateSalaryInput) => Promise<Employee | null>;
  createDepartment: (input: CreateDepartmentInput) => Promise<Department>;
  updateDepartment: (id: string, input: CreateDepartmentInput) => Promise<Department | null>;
  deleteDepartment: (id: string) => Promise<boolean>;
  createJobPosition: (input: CreateJobPositionInput) => Promise<JobPosition>;
  updateJobPosition: (id: string, input: CreateJobPositionInput) => Promise<JobPosition | null>;
  deleteJobPosition: (id: string) => Promise<boolean>;
  createAttendance: (input: CreateAttendanceInput) => Promise<AttendanceRecord>;
  updateAttendance: (id: string, input: CreateAttendanceInput) => Promise<AttendanceRecord | null>;
  deleteAttendance: (id: string) => Promise<boolean>;
  createLeaveRequest: (input: CreateLeaveInput) => Promise<LeaveRequest>;
  updateLeaveRequest: (id: string, input: CreateLeaveInput) => Promise<LeaveRequest | null>;
  deleteLeaveRequest: (id: string) => Promise<boolean>;
  updateLeaveStatus: (id: string, status: 'Approved' | 'Rejected') => Promise<LeaveRequest | null>;
  cancelLeaveRequest: (id: string) => Promise<LeaveRequest | null>;
  sendEmployeeMessage: (input: SendMessageInput) => Promise<SendMessageResult>;
  deleteMessage: (id: string) => Promise<boolean>;
  deleteMessages: (ids: string[]) => Promise<number>;
  deleteAllMessages: () => Promise<number>;
  getPayrollRunPreview: () => Promise<PayrollRunPreview>;
  processPayroll: (id: string) => Promise<{ payroll: PayrollRecord; transactionId: string } | null>;
  runPayrollAndSync: () => Promise<PayrollRunResult>;
  getEmployeePayrollStatuses: () => Promise<EmployeePayrollStatus[]>;
  payEmployee: (employeeId: string) => Promise<
    { payroll: PayrollRecord; transactionId: string } | { error: string }
  >;
  getSettings: () => Promise<HrSettings>;
  updateSettings: (input: Partial<HrSettings>) => Promise<HrSettings>;
  getLeaveBalances: () => Promise<LeaveBalance[]>;
  updateLeaveBalance: (input: UpdateLeaveBalanceInput) => Promise<LeaveBalance | null>;
  getHolidays: () => Promise<Holiday[]>;
  createHoliday: (input: CreateHolidayInput) => Promise<Holiday>;
  deleteHoliday: (id: string) => Promise<boolean>;
  getEmployeeNotes: (employeeId: string) => Promise<EmployeeNote[]>;
  createEmployeeNote: (input: CreateEmployeeNoteInput) => Promise<EmployeeNote>;
  deleteEmployeeNote: (id: string) => Promise<boolean>;
  getEmployeeDocuments: (employeeId: string) => Promise<EmployeeDocument[]>;
  addEmployeeDocument: (input: CreateDocumentInput) => Promise<EmployeeDocument>;
  getEmployeeDocumentData: (id: string) => Promise<{ fileName: string; fileData: string } | null>;
  deleteEmployeeDocument: (id: string) => Promise<boolean>;
  getAuditLog: (limit?: number) => Promise<AuditLogEntry[]>;
  deleteAllAuditLog: (password: string) => Promise<{ ok: true; deleted: number } | { ok: false; error: string }>;
  getNotifications: () => Promise<HrNotification[]>;
  markNotificationRead: (id: string) => Promise<boolean>;
  markAllNotificationsRead: () => Promise<boolean>;
  getMessageTemplates: () => Promise<MessageTemplate[]>;
  createMessageTemplate: (input: CreateMessageTemplateInput) => Promise<MessageTemplate>;
  deleteMessageTemplate: (id: string) => Promise<boolean>;
  getAttendanceTrends: () => Promise<AttendanceTrend[]>;
  getDepartmentCostReport: () => Promise<DepartmentCostReport[]>;
  getAccountingSyncStatus: () => Promise<AccountingSyncStatus[]>;
  terminateEmployee: (input: TerminateEmployeeInput) => Promise<boolean>;
  approveLeaveManager: (id: string) => Promise<LeaveRequest | null>;
  approveLeaveHr: (id: string) => Promise<LeaveRequest | null>;
  syncLeaveStatuses: () => Promise<number>;
  clockIn: (employeeName: string) => Promise<AttendanceRecord>;
  clockOut: (employeeName: string) => Promise<AttendanceRecord>;
  importAttendanceCsv: (csvText: string) => Promise<number>;
  exportHrBackup: () => Promise<string>;
  importHrBackup: (jsonText: string) => Promise<boolean>;
  getKioskCheckInConfig: (baseUrl: string) => Promise<KioskCheckInConfig>;
  regenerateCheckInSiteToken: (baseUrl: string) => Promise<KioskCheckInConfig>;
  lookupCheckIn: (input: CheckInLookupInput) => Promise<CheckInLookupResult>;
  confirmCheckIn: (input: CheckInConfirmInput) => Promise<CheckInConfirmResult>;
  getAttendanceScanLog: (limit?: number) => Promise<AttendanceScanLogEntry[]>;
}
