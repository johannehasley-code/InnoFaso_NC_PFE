import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Proxy dev : le front (5173) relaie /api vers le backend Express (4000).
  server: {
    proxy: {
      '/api': 'http://localhost:4000',
    },
  },
})
