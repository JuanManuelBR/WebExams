import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
        cookieDomainRewrite: 'localhost', // ← NUEVO: Reescribe el dominio de las cookies
        configure: (proxy, options) => {
          proxy.on('proxyRes', (proxyRes, req, res) => {
            // Log para debug
            const cookies = proxyRes.headers['set-cookie'];
            if (cookies) {
              console.log('🍪 Cookies recibidas del backend:', cookies);
            }
          });
        }
      }
    }
  }
})