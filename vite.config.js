import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const api = (env.VITE_API_URL || 'https://lenar-production.up.railway.app').replace(/\/$/, '')
  return {
    plugins: [react(), tailwindcss()],
    // Same as the Cloudflare worker in production: /api/* goes to the Railway backend.
    server: {
      proxy: {
        '/api': { target: api, changeOrigin: true, rewrite: (p) => p.replace(/^\/api/, '') },
      },
    },
  }
})
