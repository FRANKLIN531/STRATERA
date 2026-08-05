import { app, BrowserWindow, dialog, ipcMain } from 'electron';
import fs from 'fs';
import path from 'path';
import {
  createStrateraDatabase,
  loadDatabaseConfig,
  registerAllIpcHandlers,
  startKioskHttpServer,
  stopKioskHttpServer,
} from '@stratera/database';
import type { StrateraDatabase } from '@stratera/database';

let db: StrateraDatabase | null = null;

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    title: 'STRATERA',
      icon: path.join(__dirname, '../../assets/symbol.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      plugins: true,
    },
    show: false,
    backgroundColor: '#001B3A',
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL).catch((err) => {
      console.error('Failed to load dev URL:', err);
      mainWindow.loadURL(`http://127.0.0.1:${process.env.STRATERA_DEV_PORT || 5190}/`);
    });
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

app.whenReady().then(async () => {
  try {
    const dbDir = path.join(app.getPath('appData'), 'STRATERA');
    if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });
    const dbPath = path.join(dbDir, 'stratera.db');
    db = await createStrateraDatabase(loadDatabaseConfig(dbPath));
    registerAllIpcHandlers(ipcMain, db);
    try {
      startKioskHttpServer(db);
    } catch (kioskErr) {
      console.error('STRATERA kiosk HTTP server failed:', kioskErr);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('STRATERA database failed to start:', err);
    dialog.showErrorBox(
      'STRATERA could not start',
      `The SQL Server database did not connect, so the app cannot start.\n\n${message}\n\nCopy .env.example to .env, set your SQL Server details, then run start-stratera.bat again.`,
    );
    app.quit();
    return;
  }
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
  stopKioskHttpServer();
  db?.close();
});
