import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

// Custom plugin to handle ?asset imports like electron-vite does during test
function assetPlugin() {
  return {
    name: 'vitest-asset-plugin',
    resolveId(id: string) {
      if (id.includes('?asset')) {
        // Return a virtual module ID to handle in the load hook
        return id
      }
      return null
    },
    load(id: string) {
      if (id.includes('?asset')) {
        // Remove the ?asset query and resolve to absolute path
        const cleanPath = id.replace('?asset', '')
        let resolvedPath = cleanPath

        // Handle @resources alias
        if (cleanPath.startsWith('@resources/')) {
          resolvedPath = resolve(cleanPath.replace('@resources/', 'resources/'))
        }

        // For ?asset imports, return the resolved absolute path as the default export
        return `export default ${JSON.stringify(resolvedPath)}`
      }
      return null
    }
  }
}

export default defineConfig({
  resolve: {
    alias: {
      '@backend': resolve('src/backend'),
      '@common': resolve('src/common'),
      '@resources': resolve('resources')
    }
  },
  plugins: [assetPlugin()],
  test: {
    name: 'backend',
    environment: 'node',
    include: ['tests/backend/**/*.{test,spec}.ts'],
    exclude: ['**/node_modules/**', '**/out/**', '**/coverage/**'],
    // Load environment variables before running tests
    setupFiles: ['tests/setup.ts'],
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
