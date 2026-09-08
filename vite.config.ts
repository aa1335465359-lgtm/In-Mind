import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Allow sandboxed preview hosts (e.g. *.e2b.app); localhost is always allowed.
    allowedHosts: ['.e2b.app'],
  },
})
