import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  root: '.',
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
      },
    },
  },
  server: {
    port: 5173,
    strictPort: false,
  },
  base: '/',
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@auth': resolve(__dirname, '../../../packages/auth/src'),
    },
  },
});