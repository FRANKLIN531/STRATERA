import type { IpcMain } from 'electron';
import { shell } from 'electron';
import type { StrateraDatabase } from './database';
import type { Invoice, CreateDepartmentInput } from './types';

export function registerAllIpcHandlers(ipcMain: IpcMain, db: StrateraDatabase): void {
  ipcMain.handle(
    'auth:login',
    (_event, email: string, password: string, appType: 'accounting' | 'hr') => {
      return db.login(email, password, appType);
    },
  );

  ipcMain.handle('auth:logout', () => {
    db.logout();
    return true;
  });

  ipcMain.handle('auth:getCurrentUser', () => db.getCurrentUser());

  ipcMain.handle('auth:verifyPassword', (_event, password: string) =>
    db.verifyCurrentUserPassword(password),
  );

  ipcMain.handle('auth:isInitialSetupPending', () => db.isInitialSetupPending());

  ipcMain.handle('auth:sendPasswordResetCode', async (_event, email: string) => {
    try {
      return await db.sendPasswordResetCode(email);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return { ok: false as const, error: msg || 'Could not send reset code.' };
    }
  });

  ipcMain.handle(
    'auth:completePasswordResetWithCode',
    (_event, email: string, code: string, newPassword: string) =>
      db.completePasswordResetWithCode(email, code, newPassword),
  );

  ipcMain.handle('auth:completeCredentialUpdate', async (_event, email: string, newPassword: string) =>
    db.completeCredentialUpdate(email, newPassword),
  );

  ipcMain.handle('auth:sendCredentialEmailVerification', async (_event, email: string, smtp) => {
    if (!db) {
      return { ok: false, error: 'Database not ready. Restart STRATERA.' };
    }
    try {
      const result = await db.prepareCredentialEmailVerification(email, smtp);
      return result.ok ? { ok: true } : { ok: false, error: result.error };
    } catch (err) {
      console.error('auth:sendCredentialEmailVerification failed:', err);
      const msg = err instanceof Error ? err.message : String(err);
      return { ok: false, error: msg || 'Unable to send verification email.' };
    }
  });

  ipcMain.handle('auth:verifyCredentialEmailCode', (_event, email: string, code: string) => {
    const result = db.verifyCredentialEmailCode(email, code);
    return result.ok ? { ok: true } : { ok: false, error: result.error };
  });

  ipcMain.handle('accounting:getDashboardStats', () => db.getAccountingDashboardStats());
  ipcMain.handle('accounting:getAccounts', () => db.getAccounts());
  ipcMain.handle('accounting:getTransactions', () => db.getTransactions());
  ipcMain.handle('accounting:getInvoices', () => db.getInvoices());
  ipcMain.handle('accounting:createTransaction', (_e, input) => db.createTransaction(input));
  ipcMain.handle('accounting:createInvoice', (_e, input) => db.createInvoice(input));
  ipcMain.handle('accounting:updateTransaction', (_e, id, input) => db.updateTransaction(id, input));
  ipcMain.handle('accounting:deleteTransaction', (_e, id) => db.deleteTransaction(id));
  ipcMain.handle('accounting:updateInvoice', (_e, id, input) => db.updateInvoice(id, input));
  ipcMain.handle('accounting:deleteInvoice', (_e, id) => db.deleteInvoice(id));
  ipcMain.handle('accounting:emailInvoice', (_e, invoice: Invoice) => {
    const amount = invoice.amount.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
    const subject = encodeURIComponent(`STRATERA Invoice ${invoice.id}`);
    const body = encodeURIComponent(
      `Dear ${invoice.client},\n\nPlease find invoice ${invoice.id} for ${amount}.\nIssue date: ${invoice.date}\nDue date: ${invoice.dueDate}\nStatus: ${invoice.status}\n\nThank you,\nSTRATERA R&D Software Group`,
    );
    shell.openExternal(`mailto:?subject=${subject}&body=${body}`);
    return true;
  });

  ipcMain.handle('hr:getDashboardStats', () => db.getHrDashboardStats());
  ipcMain.handle('hr:getEmployees', () => db.getEmployees());
  ipcMain.handle('hr:getPayroll', () => db.getPayroll());
  ipcMain.handle('hr:getAttendance', () => db.getAttendance());
  ipcMain.handle('hr:getLeaveRequests', () => db.getLeaveRequests());
  ipcMain.handle('hr:getDepartments', () => db.getDepartments());
  ipcMain.handle('hr:createEmployee', (_e, input) => db.createEmployee(input));
  ipcMain.handle('hr:updateEmployee', (_e, id, input) => db.updateEmployee(id, input));
  ipcMain.handle('hr:deleteEmployee', (_e, id) => db.deleteEmployee(id));
  ipcMain.handle('hr:createLeaveRequest', (_e, input) => db.createLeaveRequest(input));
  ipcMain.handle('hr:updateLeaveRequest', (_e, id, input) => db.updateLeaveRequest(id, input));
  ipcMain.handle('hr:deleteLeaveRequest', (_e, id) => db.deleteLeaveRequest(id));
  ipcMain.handle('hr:updateLeaveStatus', (_e, id: string, status: 'Approved' | 'Rejected') =>
    db.updateLeaveStatus(id, status),
  );
  ipcMain.handle('hr:cancelLeaveRequest', (_e, id: string) => {
    const result = db.cancelLeaveRequest(id);
    if (!result) {
      throw new Error('This leave could not be cancelled. It may already be cancelled, rejected, or removed.');
    }
    return result;
  });
  ipcMain.handle('hr:getPayrollRunPreview', () => db.getPayrollRunPreview());
  ipcMain.handle('hr:processPayroll', (_e, id: string) => db.processPayroll(id));
  ipcMain.handle('hr:runPayrollAndSync', () => db.runPayrollAndSync());
  ipcMain.handle('hr:getEmployeePayrollStatuses', () => db.getEmployeePayrollStatuses());
  ipcMain.handle('hr:payEmployee', (_e, employeeId: string) => db.payEmployee(employeeId));
  ipcMain.handle('hr:getJobPositions', () => db.getJobPositions());
  ipcMain.handle('hr:getMessages', () => db.getMessages());
  ipcMain.handle('hr:updateEmployeeSalary', (_e, input) => db.updateEmployeeSalary(input));
  ipcMain.handle('hr:createDepartment', (_e, input) => {
    try {
      return db.createDepartment(input);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new Error(msg || 'Could not create department.');
    }
  });
  ipcMain.handle('hr:updateDepartment', (_e, id, input) => {
    try {
      return db.updateDepartment(id, input);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new Error(msg || 'Could not update department.');
    }
  });
  ipcMain.handle('hr:deleteDepartment', (_e, id) => db.deleteDepartment(id));
  ipcMain.handle('hr:createJobPosition', (_e, input) => db.createJobPosition(input));
  ipcMain.handle('hr:updateJobPosition', (_e, id, input) => db.updateJobPosition(id, input));
  ipcMain.handle('hr:deleteJobPosition', (_e, id) => db.deleteJobPosition(id));
  ipcMain.handle('hr:createAttendance', (_e, input) => db.createAttendance(input));
  ipcMain.handle('hr:updateAttendance', (_e, id, input) => db.updateAttendance(id, input));
  ipcMain.handle('hr:deleteAttendance', (_e, id) => db.deleteAttendance(id));
  ipcMain.handle('hr:sendEmployeeMessage', async (_e, input) => {
    try {
      return await db.sendEmployeeMessage(input);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new Error(msg || 'Could not send message.');
    }
  });
  ipcMain.handle('hr:deleteMessage', (_e, id: string) => db.deleteMessage(id));
  ipcMain.handle('hr:deleteMessages', (_e, ids: string[]) => db.deleteMessages(ids));
  ipcMain.handle('hr:deleteAllMessages', () => db.deleteAllMessages());

  ipcMain.handle('hr:getSettings', () => db.getSettings());
  ipcMain.handle('hr:updateSettings', (_e, input) => db.updateSettings(input));
  ipcMain.handle('hr:getLeaveBalances', () => db.getLeaveBalances());
  ipcMain.handle('hr:updateLeaveBalance', (_e, input) => db.updateLeaveBalance(input));
  ipcMain.handle('hr:getHolidays', () => db.getHolidays());
  ipcMain.handle('hr:createHoliday', (_e, input) => db.createHoliday(input));
  ipcMain.handle('hr:deleteHoliday', (_e, id) => db.deleteHoliday(id));
  ipcMain.handle('hr:getEmployeeNotes', (_e, employeeId) => db.getEmployeeNotes(employeeId));
  ipcMain.handle('hr:createEmployeeNote', (_e, input) => db.createEmployeeNote(input));
  ipcMain.handle('hr:deleteEmployeeNote', (_e, id) => db.deleteEmployeeNote(id));
  ipcMain.handle('hr:getEmployeeDocuments', (_e, employeeId) => db.getEmployeeDocuments(employeeId));
  ipcMain.handle('hr:addEmployeeDocument', (_e, input) => db.addEmployeeDocument(input));
  ipcMain.handle('hr:getEmployeeDocumentData', (_e, id) => db.getEmployeeDocumentData(id));
  ipcMain.handle('hr:deleteEmployeeDocument', (_e, id) => db.deleteEmployeeDocument(id));
  ipcMain.handle('hr:getAuditLog', (_e, limit) => db.getAuditLog(limit));
  ipcMain.handle('hr:deleteAllAuditLog', (_e, password: string) => db.deleteAllAuditLog(password));
  ipcMain.handle('hr:getNotifications', () => db.getNotifications());
  ipcMain.handle('hr:markNotificationRead', (_e, id) => db.markNotificationRead(id));
  ipcMain.handle('hr:markAllNotificationsRead', () => db.markAllNotificationsRead());
  ipcMain.handle('hr:getMessageTemplates', () => db.getMessageTemplates());
  ipcMain.handle('hr:createMessageTemplate', (_e, input) => db.createMessageTemplate(input));
  ipcMain.handle('hr:deleteMessageTemplate', (_e, id) => db.deleteMessageTemplate(id));
  ipcMain.handle('hr:getAttendanceTrends', () => db.getAttendanceTrends());
  ipcMain.handle('hr:getDepartmentCostReport', () => db.getDepartmentCostReport());
  ipcMain.handle('hr:getAccountingSyncStatus', () => db.getAccountingSyncStatus());
  ipcMain.handle('hr:terminateEmployee', (_e, input) => db.terminateEmployee(input));
  ipcMain.handle('hr:approveLeaveManager', (_e, id) => db.approveLeaveManager(id));
  ipcMain.handle('hr:approveLeaveHr', (_e, id) => db.approveLeaveHr(id));
  ipcMain.handle('hr:syncLeaveStatuses', () => db.syncLeaveStatuses());
  ipcMain.handle('hr:clockIn', (_e, name) => {
    try {
      return db.clockIn(name);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new Error(msg || 'Could not clock in.');
    }
  });
  ipcMain.handle('hr:clockOut', (_e, name) => {
    try {
      return db.clockOut(name);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new Error(msg || 'Could not clock out.');
    }
  });
  ipcMain.handle('hr:importAttendanceCsv', (_e, csv) => db.importAttendanceCsv(csv));
  ipcMain.handle('hr:exportHrBackup', () => db.exportHrBackup());
  ipcMain.handle('hr:importHrBackup', (_e, json) => db.importHrBackup(json));
  ipcMain.handle('hr:getKioskCheckInConfig', (_e, baseUrl: string) => db.getKioskCheckInConfig(baseUrl));
  ipcMain.handle('hr:regenerateCheckInSiteToken', (_e, baseUrl: string) => db.regenerateCheckInSiteToken(baseUrl));
  ipcMain.handle('hr:lookupCheckIn', (_e, input) => db.lookupCheckIn(input));
  ipcMain.handle('hr:confirmCheckIn', (_e, input) => db.confirmCheckIn(input));
  ipcMain.handle('hr:getAttendanceScanLog', (_e, limit?: number) => db.getAttendanceScanLog(limit));
}
