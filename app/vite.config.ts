import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import electron from 'vite-plugin-electron/simple';
import path from 'path';
import { startElectronDev } from './electron-dev.mjs';
import { strateraDevAuthPlugin } from './stratera-dev-auth.mjs';

const databaseAlias = path.resolve(__dirname, '../database/src');
const accountingSrc = path.resolve(__dirname, '../accounting/src');
const hrSrc = path.resolve(__dirname, '../hr/src');

export default defineConfig({
  server: {
    host: '0.0.0.0',
    port: Number(process.env.STRATERA_DEV_PORT) || 5190,
    strictPort: true,
    open: false,
    headers: {
      'Cache-Control': 'no-store',
    },
    fs: {
      deny: ['**/release/**'],
    },
  },
  optimizeDeps: {
    entries: ['index.html'],
  },
  preview: {
    host: true,
    port: Number(process.env.STRATERA_DEV_PORT) || 5190,
    strictPort: true,
  },
  plugins: [
    react(),
    strateraDevAuthPlugin(),
    electron({
      main: {
        entry: 'electron/main.ts',
        onstart() {
          startElectronDev(__dirname);
        },
        vite: {
          resolve: {
            alias: {
              '@stratera/database': databaseAlias,
            },
          },
          build: {
            rollupOptions: {
              external: ['electron', 'sql.js', 'pg', 'mssql'],
            },
          },
        },
      },
      preload: {
        input: 'electron/preload.ts',
        onstart(args) {
          if (process.electronApp?.pid) {
            args.reload();
          } else {
            startElectronDev(__dirname);
          }
        },
      },
    }),
  ],
  resolve: {
    alias: {
      '@stratera/shared': path.resolve(__dirname, '../shared/src'),
      '@accounting': accountingSrc,
      '@hr': hrSrc,
    },
  },
  publicDir: path.resolve(__dirname, '../assets'),
});
