import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: process.env.ELECTRON_BUILD ? './' : '/',
  build: {
    chunkSizeWarningLimit: 1100,
  },
  optimizeDeps: {
    exclude: ['remark-breaks', 'remark-gfm'],
  },
})
