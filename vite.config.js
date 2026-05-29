import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    allowedHosts: [
      '.serveousercontent.com',
      '.loca.lt',
      '.ngrok.io',
      '.ngrok-free.app',
    ],
  },
})
