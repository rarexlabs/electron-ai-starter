import { defineConfig } from 'drizzle-kit'
import { config } from 'dotenv'
import * as path from 'path'

// Load .env file for drizzle-kit CLI
config()

const dbFolder = process.env.MAIN_VITE_DB_FOLDER
if (!dbFolder) {
  throw new Error('MAIN_VITE_DB_FOLDER environment variable is required for Drizzle Kit operations')
}
const dbPath = path.join(dbFolder, 'app.db')
console.log('🔧 Drizzle Kit using database path:', dbPath)

export default defineConfig({
  out: './src/main/db/migrations',
  schema: './src/main/db/schema.ts',
  dialect: 'sqlite',
  dbCredentials: {
    // This is only used by Drizzle Kit CLI commands (generate, push, studio)
    // The actual runtime connection uses better-sqlite3 client passed to drizzle()
    url: dbPath
  },
  verbose: true,
  strict: true
})
