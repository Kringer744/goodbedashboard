import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/evo-api': {
        target: 'https://evo-integracao-api.w12app.com.br',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/evo-api/, ''),
      },
      '/evo-integracao': {
        target: 'https://evo-integracao.w12app.com.br',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/evo-integracao/, ''),
      },
    },
  },
})
