import { defineConfig } from 'drizzle-kit'
import { config } from 'dotenv'
import * as path from 'path'

// Load .env file for drizzle-kit CLI
config()

const dbPath = process.env.MAIN_VITE_USER_DATA_PATH
if (!dbPath) {
  throw new Error(
    'MAIN_VITE_USER_DATA_PATH environment variable is required for Drizzle Kit operations'
  )
}
const fullDbPath = path.join(dbPath, 'db', 'app.db')
console.log('🔧 Drizzle Kit using database path:', fullDbPath)

export default defineConfig({
  out: './src/backend/db/migrations',
  schema: './src/backend/db/schema.ts',
  dialect: 'sqlite',
  dbCredentials: {
    // This is only used by Drizzle Kit CLI commands (generate, push, studio)
    // The actual runtime connection uses better-sqlite3 client passed to drizzle()
    url: fullDbPath
  },
  verbose: true,
  strict: true
})
