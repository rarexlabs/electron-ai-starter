import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

// This config is specifically for shadcn CLI detection and is not used in the build process.
// electron.vite.config.ts is the actual source of truth for the build.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src/renderer/src'),
      '@/components': resolve(__dirname, './src/renderer/src/components'),
      '@/lib': resolve(__dirname, './src/renderer/src/lib'),
      '@/utils': resolve(__dirname, './src/renderer/src/lib/utils')
    }
  }
})
