import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // The backend only accepts requests from port 5173. strictPort makes Vite stop with an
  // error if that port is busy, instead of silently moving to another one.
  server: { port: 5173, strictPort: true },
})
