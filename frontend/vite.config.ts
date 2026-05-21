import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: process.env.ELECTRON_BUILD ? './' : '/',
  build: {
    chunkSizeWarningLimit: 1100,
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (id.includes('node_modules')) {
            if (id.includes('react-router')) return 'vendor-router'
            if (id.includes('@tanstack')) return 'vendor-query'
            if (id.includes('i18next')) return 'vendor-i18n'
            if (id.includes('/react/') || id.includes('/react-dom/') || id.includes('/scheduler/')) return 'vendor-react'
          }
        },
      },
    },
  },
  optimizeDeps: {
    exclude: ['remark-breaks', 'remark-gfm'],
  },
})
