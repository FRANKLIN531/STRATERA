import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import electron from 'vite-plugin-electron/simple';
import path from 'path';

const databaseAlias = path.resolve(__dirname, '../database/src');

export default defineConfig({
  publicDir: path.resolve(__dirname, '../assets'),
  plugins: [
    react(),
    electron({
      main: {
        entry: 'electron/main.ts',
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
      },
    }),
  ],
  resolve: {
    alias: {
      '@stratera/shared': path.resolve(__dirname, '../shared/src'),
    },
  },
});
