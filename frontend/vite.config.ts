import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import { fileURLToPath } from 'url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  const host = env.VITE_HOST || '0.0.0.0'
  const port = Number(env.VITE_PORT || 5173)
  const previewPort = Number(env.VITE_PREVIEW_PORT || 4173)
  const proxyTarget = env.VITE_API_PROXY || 'http://localhost:8000'

  return {
    root: '.',
    plugins: [react()],
    server: {
      host,
      port,
      strictPort: true,
      open: false,
      proxy: {
        '/api': {
          target: proxyTarget,
          changeOrigin: true,
        },
      },
    },
    preview: {
      host,
      port: previewPort,
      strictPort: true,
    },
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src'),
        '@ui': resolve(__dirname, 'packages/components/ui/src'),
        '@auth': resolve(__dirname, 'packages/contexts/auth/src'),
        '@i18n': resolve(__dirname, 'packages/contexts/i18n/src'),
        '@registration-form': resolve(__dirname, 'packages/components/registration-form/src'),
        '@assets': resolve(__dirname, '../tests/attached_assets'),
        '@shared': resolve(__dirname, '../backend/shared/src'),
      },
    },
    build: {
      outDir: 'dist',
      rollupOptions: {
        input: resolve(__dirname, 'index.html'),
      },
    },
  }
})

