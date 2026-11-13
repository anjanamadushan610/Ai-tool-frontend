import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Local dev: the control plane runs on :8000 and is reached through /api, the same path Caddy uses in production.
const api = { '/api': { target: 'http://127.0.0.1:8000', changeOrigin: false } }

export default defineConfig({
  plugins: [react()],
  server: { port: 5190, proxy: api },
  preview: { port: 5191, proxy: api },
  build: { sourcemap: false, chunkSizeWarningLimit: 1500 },
})
