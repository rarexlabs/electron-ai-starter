import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    name: 'main',
    environment: 'node',
    include: ['tests/main/**/*.{test,spec}.ts'],
    exclude: ['**/node_modules/**', '**/out/**', '**/coverage/**'],
    // Use forks pool for better Electron compatibility (native modules)
    pool: 'forks',
    // Timeouts appropriate for database operations
    testTimeout: 10000,
    hookTimeout: 10000
  },
  esbuild: {
    target: 'node18'
  }
})
