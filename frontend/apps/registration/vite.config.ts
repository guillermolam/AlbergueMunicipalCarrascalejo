import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@ui': path.resolve(__dirname, '../../../packages/ui/src'),
      '@contexts': path.resolve(__dirname, '../../../src/contexts'),
      '@registration-form': path.resolve(__dirname, '../../../packages/components/registration-form/src'),
      '@auth': path.resolve(__dirname, '../../../packages/auth/src'),
    },
  },
  build: {
    outDir: '../../../dist/apps/registration',
    assetsDir: '.',
  },
});
