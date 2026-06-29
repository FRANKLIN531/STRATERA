import { app, BrowserWindow, ipcMain } from 'electron';
import fs from 'fs';
import path from 'path';
import { createStrateraDatabase, loadDatabaseConfig, registerAllIpcHandlers } from '@stratera/database';
import type { StrateraDatabase } from '@stratera/database';

let db: StrateraDatabase | null = null;

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    title: 'STRATERA Accounting',
      icon: path.join(__dirname, '../../assets/symbol.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    show: false,
    backgroundColor: '#001B3A',
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

app.whenReady().then(async () => {
  const dbDir = path.join(app.getPath('appData'), 'STRATERA');
  if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });
  const dbPath = path.join(dbDir, 'stratera.db');
  db = await createStrateraDatabase(loadDatabaseConfig(dbPath));
  registerAllIpcHandlers(ipcMain, db);
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.on('will-quit', () => {
  db?.close();
});
