import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), basicSsl()],
  server: {
    proxy: {
      '/api': {
        target: 'http://192.168.1.11:3002',
        changeOrigin: true
      },
      '/socket.io': {
        target: 'http://192.168.1.11:3002',
        ws: true
      }
    }
  }
})
