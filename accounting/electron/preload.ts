import { contextBridge, ipcRenderer } from 'electron';

const api = {
  login: (email: string, password: string) => ipcRenderer.invoke('auth:login', email, password, 'accounting'),
  logout: () => ipcRenderer.invoke('auth:logout'),
  getCurrentUser: () => ipcRenderer.invoke('auth:getCurrentUser'),
  verifyPassword: (password: string) => ipcRenderer.invoke('auth:verifyPassword', password),
  getDashboardStats: () => ipcRenderer.invoke('accounting:getDashboardStats'),
  getAccounts: () => ipcRenderer.invoke('accounting:getAccounts'),
  getTransactions: () => ipcRenderer.invoke('accounting:getTransactions'),
  getInvoices: () => ipcRenderer.invoke('accounting:getInvoices'),
  createTransaction: (input: unknown) => ipcRenderer.invoke('accounting:createTransaction', input),
  createInvoice: (input: unknown) => ipcRenderer.invoke('accounting:createInvoice', input),
  updateTransaction: (id: string, input: unknown) => ipcRenderer.invoke('accounting:updateTransaction', id, input),
  deleteTransaction: (id: string) => ipcRenderer.invoke('accounting:deleteTransaction', id),
  updateInvoice: (id: string, input: unknown) => ipcRenderer.invoke('accounting:updateInvoice', id, input),
  deleteInvoice: (id: string) => ipcRenderer.invoke('accounting:deleteInvoice', id),
  emailInvoice: (invoice: unknown) => ipcRenderer.invoke('accounting:emailInvoice', invoice),
};

contextBridge.exposeInMainWorld('stratera', {
  platform: process.platform,
  appName: 'STRATERA Accounting',
  isElectron: true,
  api,
});
