import { contextBridge, ipcRenderer } from 'electron';



const authApi = {

  login: (email: string, password: string, module: 'accounting' | 'hr') =>

    ipcRenderer.invoke('auth:login', email, password, module),

  logout: () => ipcRenderer.invoke('auth:logout'),

  getCurrentUser: () => ipcRenderer.invoke('auth:getCurrentUser'),

  isInitialSetupPending: () => ipcRenderer.invoke('auth:isInitialSetupPending'),

  sendPasswordResetCode: (email: string) => ipcRenderer.invoke('auth:sendPasswordResetCode', email),

  completePasswordResetWithCode: (email: string, code: string, newPassword: string) =>
    ipcRenderer.invoke('auth:completePasswordResetWithCode', email, code, newPassword),

  completeCredentialUpdate: (email: string, newPassword: string) =>
    ipcRenderer.invoke('auth:completeCredentialUpdate', email, newPassword),

  sendCredentialEmailVerification: (email: string, smtp: unknown) =>
    ipcRenderer.invoke('auth:sendCredentialEmailVerification', email, smtp),

  verifyCredentialEmailCode: (email: string, code: string) =>
    ipcRenderer.invoke('auth:verifyCredentialEmailCode', email, code),

  verifyPassword: (password: string) => ipcRenderer.invoke('auth:verifyPassword', password),

};



const hrApi = {

  ...authApi,

  getDashboardStats: () => ipcRenderer.invoke('hr:getDashboardStats'),

  getEmployees: () => ipcRenderer.invoke('hr:getEmployees'),

  getAttendance: () => ipcRenderer.invoke('hr:getAttendance'),

  getLeaveRequests: () => ipcRenderer.invoke('hr:getLeaveRequests'),

  getDepartments: () => ipcRenderer.invoke('hr:getDepartments'),

  getJobPositions: () => ipcRenderer.invoke('hr:getJobPositions'),

  getMessages: () => ipcRenderer.invoke('hr:getMessages'),

  createEmployee: (input: unknown) => ipcRenderer.invoke('hr:createEmployee', input),

  updateEmployee: (id: string, input: unknown) => ipcRenderer.invoke('hr:updateEmployee', id, input),

  deleteEmployee: (id: string) => ipcRenderer.invoke('hr:deleteEmployee', id),

  updateEmployeeSalary: (input: unknown) => ipcRenderer.invoke('hr:updateEmployeeSalary', input),

  createDepartment: (input: unknown) => ipcRenderer.invoke('hr:createDepartment', input),

  updateDepartment: (id: string, input: unknown) => ipcRenderer.invoke('hr:updateDepartment', id, input),

  deleteDepartment: (id: string) => ipcRenderer.invoke('hr:deleteDepartment', id),

  createJobPosition: (input: unknown) => ipcRenderer.invoke('hr:createJobPosition', input),

  updateJobPosition: (id: string, input: unknown) => ipcRenderer.invoke('hr:updateJobPosition', id, input),

  deleteJobPosition: (id: string) => ipcRenderer.invoke('hr:deleteJobPosition', id),

  createAttendance: (input: unknown) => ipcRenderer.invoke('hr:createAttendance', input),

  updateAttendance: (id: string, input: unknown) => ipcRenderer.invoke('hr:updateAttendance', id, input),

  deleteAttendance: (id: string) => ipcRenderer.invoke('hr:deleteAttendance', id),

  createLeaveRequest: (input: unknown) => ipcRenderer.invoke('hr:createLeaveRequest', input),

  updateLeaveRequest: (id: string, input: unknown) => ipcRenderer.invoke('hr:updateLeaveRequest', id, input),

  deleteLeaveRequest: (id: string) => ipcRenderer.invoke('hr:deleteLeaveRequest', id),

  updateLeaveStatus: (id: string, status: 'Approved' | 'Rejected') =>

    ipcRenderer.invoke('hr:updateLeaveStatus', id, status),

  cancelLeaveRequest: (id: string) => ipcRenderer.invoke('hr:cancelLeaveRequest', id),

  sendEmployeeMessage: (input: unknown) => ipcRenderer.invoke('hr:sendEmployeeMessage', input),

  deleteMessage: (id: string) => ipcRenderer.invoke('hr:deleteMessage', id),
  deleteMessages: (ids: string[]) => ipcRenderer.invoke('hr:deleteMessages', ids),
  deleteAllMessages: () => ipcRenderer.invoke('hr:deleteAllMessages'),

  getSettings: () => ipcRenderer.invoke('hr:getSettings'),
  updateSettings: (input: unknown) => ipcRenderer.invoke('hr:updateSettings', input),
  getLeaveBalances: () => ipcRenderer.invoke('hr:getLeaveBalances'),
  updateLeaveBalance: (input: unknown) => ipcRenderer.invoke('hr:updateLeaveBalance', input),
  getHolidays: () => ipcRenderer.invoke('hr:getHolidays'),
  createHoliday: (input: unknown) => ipcRenderer.invoke('hr:createHoliday', input),
  deleteHoliday: (id: string) => ipcRenderer.invoke('hr:deleteHoliday', id),
  getEmployeeNotes: (employeeId: string) => ipcRenderer.invoke('hr:getEmployeeNotes', employeeId),
  createEmployeeNote: (input: unknown) => ipcRenderer.invoke('hr:createEmployeeNote', input),
  deleteEmployeeNote: (id: string) => ipcRenderer.invoke('hr:deleteEmployeeNote', id),
  getEmployeeDocuments: (employeeId: string) => ipcRenderer.invoke('hr:getEmployeeDocuments', employeeId),
  addEmployeeDocument: (input: unknown) => ipcRenderer.invoke('hr:addEmployeeDocument', input),
  getEmployeeDocumentData: (id: string) => ipcRenderer.invoke('hr:getEmployeeDocumentData', id),
  deleteEmployeeDocument: (id: string) => ipcRenderer.invoke('hr:deleteEmployeeDocument', id),
  getAuditLog: (limit?: number) => ipcRenderer.invoke('hr:getAuditLog', limit),
  deleteAllAuditLog: (password: string) => ipcRenderer.invoke('hr:deleteAllAuditLog', password),
  getNotifications: () => ipcRenderer.invoke('hr:getNotifications'),
  markNotificationRead: (id: string) => ipcRenderer.invoke('hr:markNotificationRead', id),
  markAllNotificationsRead: () => ipcRenderer.invoke('hr:markAllNotificationsRead'),
  getMessageTemplates: () => ipcRenderer.invoke('hr:getMessageTemplates'),
  createMessageTemplate: (input: unknown) => ipcRenderer.invoke('hr:createMessageTemplate', input),
  deleteMessageTemplate: (id: string) => ipcRenderer.invoke('hr:deleteMessageTemplate', id),
  getAttendanceTrends: () => ipcRenderer.invoke('hr:getAttendanceTrends'),
  getDepartmentCostReport: () => ipcRenderer.invoke('hr:getDepartmentCostReport'),
  terminateEmployee: (input: unknown) => ipcRenderer.invoke('hr:terminateEmployee', input),
  approveLeaveManager: (id: string) => ipcRenderer.invoke('hr:approveLeaveManager', id),
  approveLeaveHr: (id: string) => ipcRenderer.invoke('hr:approveLeaveHr', id),
  syncLeaveStatuses: () => ipcRenderer.invoke('hr:syncLeaveStatuses'),
  clockIn: (name: string) => ipcRenderer.invoke('hr:clockIn', name),
  clockOut: (name: string) => ipcRenderer.invoke('hr:clockOut', name),
  importAttendanceCsv: (csv: string) => ipcRenderer.invoke('hr:importAttendanceCsv', csv),
  exportHrBackup: () => ipcRenderer.invoke('hr:exportHrBackup'),
  importHrBackup: (json: string) => ipcRenderer.invoke('hr:importHrBackup', json),
  getKioskCheckInConfig: (baseUrl: string) => ipcRenderer.invoke('hr:getKioskCheckInConfig', baseUrl),
  regenerateCheckInSiteToken: (baseUrl: string) => ipcRenderer.invoke('hr:regenerateCheckInSiteToken', baseUrl),
  lookupCheckIn: (input: unknown) => ipcRenderer.invoke('hr:lookupCheckIn', input),
  confirmCheckIn: (input: unknown) => ipcRenderer.invoke('hr:confirmCheckIn', input),
  getAttendanceScanLog: (limit?: number) => ipcRenderer.invoke('hr:getAttendanceScanLog', limit),

};



contextBridge.exposeInMainWorld('stratera', {

  platform: process.platform,

  appName: 'STRATERA HR',

  isElectron: true,

  hr: hrApi,

  api: hrApi,

});


