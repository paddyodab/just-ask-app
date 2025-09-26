import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  assetsInclude: ['**/*.csv'],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:8001',
        changeOrigin: true,
        secure: false,
      },
      // Proxy for the new URL structure with customer hex
      '/30f8f53cf8034393b00665f664a60ddb': {
        target: 'http://localhost:8001',
        changeOrigin: true,
      }
    }
  }
})