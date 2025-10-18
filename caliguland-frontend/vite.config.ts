import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5666,
    proxy: {
      '/api': {
        target: 'http://localhost:5667',
        changeOrigin: true
      },
      '/ws': {
        target: 'ws://localhost:5667',
        ws: true
      }
    }
  }
})

