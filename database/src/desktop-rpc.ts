import type { StrateraDatabase } from './database';
import type { Invoice } from './types';

type RpcFn = (db: StrateraDatabase, args: unknown[]) => unknown | Promise<unknown>;

/**
 * Allowed desktop HTTP RPC methods. Keep in sync with ipc.ts handlers.
 * Browser clients call these when Electron IPC is unavailable but the desktop is running.
 */
export const DESKTOP_RPC_HANDLERS: Record<string, RpcFn> = {
  'auth.login': (db, [email, password, appType]) =>
    db.login(String(email), String(password), appType as 'accounting' | 'hr'),
  'auth.logout': (db) => {
    db.logout();
    return true;
  },
  'auth.getCurrentUser': (db) => db.getCurrentUser(),
  'auth.verifyPassword': (db, [password]) => db.verifyCurrentUserPassword(String(password)),
  'auth.isInitialSetupPending': (db) => db.isInitialSetupPending(),
  'auth.sendPasswordResetCode': (db, [email]) => db.sendPasswordResetCode(String(email)),
  'auth.completePasswordResetWithCode': (db, [email, code, newPassword]) =>
    db.completePasswordResetWithCode(String(email), String(code), String(newPassword)),
  'auth.completeCredentialUpdate': (db, [email, newPassword]) =>
    db.completeCredentialUpdate(String(email), String(newPassword)),
  'auth.sendCredentialEmailVerification': (db, [email, smtp]) =>
    db.prepareCredentialEmailVerification(String(email), smtp as never),
  'auth.verifyCredentialEmailCode': (db, [email, code]) => {
    const result = db.verifyCredentialEmailCode(String(email), String(code));
    return result.ok ? { ok: true } : { ok: false, error: result.error };
  },
  'auth.isSignUpVerificationEnabled': (db) => db.isSignUpVerificationEnabled(),
  'auth.signUpStart': (db, [input]) => db.signUpStart(input as never),
  'auth.signUpComplete': (db, [email, code]) => {
    const result = db.signUpComplete(String(email), String(code));
    return result.ok ? { ok: true } : { ok: false, error: result.error };
  },

  'accounting.getDashboardStats': (db) => db.getAccountingDashboardStats(),
  'accounting.getAccounts': (db) => db.getAccounts(),
  'accounting.createAccount': (db, [input]) => db.createAccount(input as never),
  'accounting.updateAccount': (db, [id, input]) => db.updateAccount(String(id), input as never),
  'accounting.deleteAccount': (db, [id]) => db.deleteAccount(String(id)),
  'accounting.getTransactions': (db) => db.getTransactions(),
  'accounting.getInvoices': (db) => db.getInvoices(),
  'accounting.createTransaction': (db, [input]) => db.createTransaction(input as never),
  'accounting.createInvoice': (db, [input]) => db.createInvoice(input as never),
  'accounting.updateTransaction': (db, [id, input]) => db.updateTransaction(String(id), input as never),
  'accounting.deleteTransaction': (db, [id]) => db.deleteTransaction(String(id)),
  'accounting.updateInvoice': (db, [id, input]) => db.updateInvoice(String(id), input as never),
  'accounting.deleteInvoice': (db, [id]) => db.deleteInvoice(String(id)),
  'accounting.emailInvoice': (_db, [invoice]) => {
    const inv = invoice as Invoice;
    const amount = inv.amount.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
    const subject = encodeURIComponent(`STRATERA Invoice ${inv.id}`);
    const body = encodeURIComponent(
      `Dear ${inv.client},\n\nPlease find invoice ${inv.id} for ${amount}.\nIssue date: ${inv.date}\nDue date: ${inv.dueDate}\nStatus: ${inv.status}\n\nThank you,\nSTRATERA R&D Software Group`,
    );
    return { mailto: `mailto:?subject=${subject}&body=${body}` };
  },
  'accounting.sendInvoiceEmail': (db, [payload]) => db.sendInvoiceEmail(payload as never),
  'accounting.exportBackup': (db) => db.exportAccountingBackup(),
  'accounting.importBackup': (db, [json]) => db.importAccountingBackup(String(json)),

  'hr.getDashboardStats': (db) => db.getHrDashboardStats(),
  'hr.getEmployees': (db) => db.getEmployees(),
  'hr.getPayroll': (db) => db.getPayroll(),
  'hr.getAttendance': (db) => db.getAttendance(),
  'hr.getLeaveRequests': (db) => db.getLeaveRequests(),
  'hr.getDepartments': (db) => db.getDepartments(),
  'hr.createEmployee': (db, [input]) => db.createEmployee(input as never),
  'hr.updateEmployee': (db, [id, input]) => db.updateEmployee(String(id), input as never),
  'hr.deleteEmployee': (db, [id]) => db.deleteEmployee(String(id)),
  'hr.createLeaveRequest': (db, [input]) => db.createLeaveRequest(input as never),
  'hr.updateLeaveRequest': (db, [id, input]) => db.updateLeaveRequest(String(id), input as never),
  'hr.deleteLeaveRequest': (db, [id]) => db.deleteLeaveRequest(String(id)),
  'hr.updateLeaveStatus': (db, [id, status]) =>
    db.updateLeaveStatus(String(id), status as 'Approved' | 'Rejected'),
  'hr.cancelLeaveRequest': (db, [id]) => {
    const result = db.cancelLeaveRequest(String(id));
    if (!result) {
      throw new Error('This leave could not be cancelled. It may already be cancelled, rejected, or removed.');
    }
    return result;
  },
  'hr.getPayrollRunPreview': (db) => db.getPayrollRunPreview(),
  'hr.processPayroll': (db, [id]) => db.processPayroll(String(id)),
  'hr.runPayrollAndSync': (db) => db.runPayrollAndSync(),
  'hr.getEmployeePayrollStatuses': (db) => db.getEmployeePayrollStatuses(),
  'hr.payEmployee': (db, [employeeId]) => db.payEmployee(String(employeeId)),
  'hr.getJobPositions': (db) => db.getJobPositions(),
  'hr.getMessages': (db) => db.getMessages(),
  'hr.updateEmployeeSalary': (db, [input]) => db.updateEmployeeSalary(input as never),
  'hr.createDepartment': (db, [input]) => db.createDepartment(input as never),
  'hr.updateDepartment': (db, [id, input]) => db.updateDepartment(String(id), input as never),
  'hr.deleteDepartment': (db, [id]) => db.deleteDepartment(String(id)),
  'hr.createJobPosition': (db, [input]) => db.createJobPosition(input as never),
  'hr.updateJobPosition': (db, [id, input]) => db.updateJobPosition(String(id), input as never),
  'hr.deleteJobPosition': (db, [id]) => db.deleteJobPosition(String(id)),
  'hr.createAttendance': (db, [input]) => db.createAttendance(input as never),
  'hr.updateAttendance': (db, [id, input]) => db.updateAttendance(String(id), input as never),
  'hr.deleteAttendance': (db, [id]) => db.deleteAttendance(String(id)),
  'hr.sendEmployeeMessage': (db, [input]) => db.sendEmployeeMessage(input as never),
  'hr.deleteMessage': (db, [id]) => db.deleteMessage(String(id)),
  'hr.deleteMessages': (db, [ids]) => db.deleteMessages(ids as string[]),
  'hr.deleteAllMessages': (db) => db.deleteAllMessages(),
  'hr.getSettings': (db) => db.getSettings(),
  'hr.updateSettings': (db, [input]) => db.updateSettings(input as never),
  'hr.getLeaveBalances': (db) => db.getLeaveBalances(),
  'hr.updateLeaveBalance': (db, [input]) => db.updateLeaveBalance(input as never),
  'hr.getHolidays': (db) => db.getHolidays(),
  'hr.createHoliday': (db, [input]) => db.createHoliday(input as never),
  'hr.deleteHoliday': (db, [id]) => db.deleteHoliday(String(id)),
  'hr.getEmployeeNotes': (db, [employeeId]) => db.getEmployeeNotes(String(employeeId)),
  'hr.createEmployeeNote': (db, [input]) => db.createEmployeeNote(input as never),
  'hr.deleteEmployeeNote': (db, [id]) => db.deleteEmployeeNote(String(id)),
  'hr.getEmployeeDocuments': (db, [employeeId]) => db.getEmployeeDocuments(String(employeeId)),
  'hr.addEmployeeDocument': (db, [input]) => db.addEmployeeDocument(input as never),
  'hr.getEmployeeDocumentData': (db, [id]) => db.getEmployeeDocumentData(String(id)),
  'hr.deleteEmployeeDocument': (db, [id]) => db.deleteEmployeeDocument(String(id)),
  'hr.getAuditLog': (db, [limit]) => db.getAuditLog(limit as number | undefined),
  'hr.deleteAllAuditLog': (db, [password]) => db.deleteAllAuditLog(String(password)),
  'hr.getNotifications': (db) => db.getNotifications(),
  'hr.markNotificationRead': (db, [id]) => db.markNotificationRead(String(id)),
  'hr.markAllNotificationsRead': (db) => db.markAllNotificationsRead(),
  'hr.getMessageTemplates': (db) => db.getMessageTemplates(),
  'hr.createMessageTemplate': (db, [input]) => db.createMessageTemplate(input as never),
  'hr.deleteMessageTemplate': (db, [id]) => db.deleteMessageTemplate(String(id)),
  'hr.getAttendanceTrends': (db) => db.getAttendanceTrends(),
  'hr.getDepartmentCostReport': (db) => db.getDepartmentCostReport(),
  'hr.getAccountingSyncStatus': (db) => db.getAccountingSyncStatus(),
  'hr.terminateEmployee': (db, [input]) => db.terminateEmployee(input as never),
  'hr.approveLeaveManager': (db, [id]) => db.approveLeaveManager(String(id)),
  'hr.approveLeaveHr': (db, [id]) => db.approveLeaveHr(String(id)),
  'hr.syncLeaveStatuses': (db) => db.syncLeaveStatuses(),
  'hr.clockIn': (db, [name]) => db.clockIn(String(name)),
  'hr.clockOut': (db, [name]) => db.clockOut(String(name)),
  'hr.importAttendanceCsv': (db, [csv]) => db.importAttendanceCsv(String(csv)),
  'hr.exportHrBackup': (db) => db.exportHrBackup(),
  'hr.importHrBackup': (db, [json]) => db.importHrBackup(String(json)),
  'hr.getKioskCheckInConfig': (db, [baseUrl]) => db.getKioskCheckInConfig(String(baseUrl ?? '')),
  'hr.regenerateCheckInSiteToken': (db, [baseUrl]) => db.regenerateCheckInSiteToken(String(baseUrl ?? '')),
  'hr.lookupCheckIn': (db, [input]) => db.lookupCheckIn(input as never),
  'hr.confirmCheckIn': (db, [input]) => db.confirmCheckIn(input as never),
  'hr.getAttendanceScanLog': (db, [limit]) => db.getAttendanceScanLog(limit as number | undefined),
};

export async function invokeDesktopRpc(
  db: StrateraDatabase,
  method: string,
  args: unknown[] = [],
): Promise<unknown> {
  const handler = DESKTOP_RPC_HANDLERS[method];
  if (!handler) {
    throw new Error(`Unknown desktop API method: ${method}`);
  }
  return handler(db, args);
}
