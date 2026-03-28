import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/predict': 'http://localhost:8000',
      '/inventory': 'http://localhost:8000',
      '/explain': 'http://localhost:8000',
      '/alerts': 'http://localhost:8000',
      '/simulate': 'http://localhost:8000',
      '/update_inventory': 'http://localhost:8000',
    },
  },
})
