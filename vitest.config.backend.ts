import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

export default defineConfig({
  test: {
    name: 'backend',
    environment: 'node',
    include: ['tests/backend/**/*.{test,spec}.ts'],
    exclude: ['**/node_modules/**', '**/out/**', '**/coverage/**'],
    // Use forks pool for better Electron compatibility (native modules)
    pool: 'forks',
    // Timeouts appropriate for database operations
    testTimeout: 10000,
    hookTimeout: 10000,
    alias: {
      '@backend': resolve('src/backend'),
      '@common': resolve('src/common'),
      '@resources': resolve('resources')
    }
  },
  esbuild: {
    target: 'node18'
  }
})
