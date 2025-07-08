import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    name: 'main',
    environment: 'node',
    include: ['tests/main/**/*.{test,spec}.ts'],
    exclude: ['**/node_modules/**', '**/out/**', '**/coverage/**'],
    // Use forks pool for better Electron compatibility (native modules)
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true // Run all tests in single process for shared context
      }
    },
    // Timeouts appropriate for database/file operations
    testTimeout: 10000,
    hookTimeout: 10000
  },
  esbuild: {
    target: 'node18'
  }
})
