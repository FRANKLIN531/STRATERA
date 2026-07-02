import { contextBridge, ipcRenderer } from 'electron';

const authApi = {
  login: (email: string, password: string) => ipcRenderer.invoke('auth:login', email, password, 'accounting'),
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
  isSignUpVerificationEnabled: () => ipcRenderer.invoke('auth:isSignUpVerificationEnabled'),
  signUpStart: (input: unknown) => ipcRenderer.invoke('auth:signUpStart', input),
  signUpComplete: (email: string, code: string) => ipcRenderer.invoke('auth:signUpComplete', email, code),
};

const accountingApi = {
  ...authApi,
  getDashboardStats: () => ipcRenderer.invoke('accounting:getDashboardStats'),
  getAccounts: () => ipcRenderer.invoke('accounting:getAccounts'),
  createAccount: (input: unknown) => ipcRenderer.invoke('accounting:createAccount', input),
  updateAccount: (id: string, input: unknown) => ipcRenderer.invoke('accounting:updateAccount', id, input),
  deleteAccount: (id: string) => ipcRenderer.invoke('accounting:deleteAccount', id),
  getTransactions: () => ipcRenderer.invoke('accounting:getTransactions'),
  getInvoices: () => ipcRenderer.invoke('accounting:getInvoices'),
  createTransaction: (input: unknown) => ipcRenderer.invoke('accounting:createTransaction', input),
  createInvoice: (input: unknown) => ipcRenderer.invoke('accounting:createInvoice', input),
  updateTransaction: (id: string, input: unknown) =>
    ipcRenderer.invoke('accounting:updateTransaction', id, input),
  deleteTransaction: (id: string) => ipcRenderer.invoke('accounting:deleteTransaction', id),
  updateInvoice: (id: string, input: unknown) => ipcRenderer.invoke('accounting:updateInvoice', id, input),
  deleteInvoice: (id: string) => ipcRenderer.invoke('accounting:deleteInvoice', id),
  emailInvoice: (invoice: unknown) => ipcRenderer.invoke('accounting:emailInvoice', invoice),
};

contextBridge.exposeInMainWorld('stratera', {
  platform: process.platform,
  appName: 'STRATERA Accounting',
  isElectron: true,
  accounting: accountingApi,
  api: accountingApi,
});
