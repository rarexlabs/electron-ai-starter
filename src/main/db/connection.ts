import { drizzle } from 'drizzle-orm/better-sqlite3'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import Database from 'better-sqlite3'
import * as path from 'path'
import { app } from 'electron'
import * as fs from 'fs'

let db: ReturnType<typeof drizzle> | null = null
let sqlite: Database.Database | null = null

export function getDatabase(): ReturnType<typeof drizzle> {
  if (!db) {
    let dbFolder = process.env.DB_FOLDER || import.meta.env.MAIN_VITE_DB_FOLDER

    // In development, require explicit DB folder. In production, fallback to userData
    const isDevelopment = process.env.NODE_ENV === 'development' || import.meta.env.DEV

    if (!dbFolder) {
      if (isDevelopment) {
        throw new Error(
          'Database folder is required in development. Please set either DB_FOLDER or MAIN_VITE_DB_FOLDER environment variable.'
        )
      }
      // Production fallback to userData directory
      dbFolder = app.getPath('userData')
    }

    const dbPath = path.join(dbFolder, 'app.db')

    // Ensure directory exists
    const dbDir = path.dirname(dbPath)
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true })
    }

    sqlite = new Database(dbPath)

    // Enable WAL mode for better performance (recommended by better-sqlite3 docs)
    sqlite.pragma('journal_mode = WAL')

    db = drizzle({ client: sqlite })
  }

  return db
}

export function runMigrations(): void {
  if (!db) {
    throw new Error('Database not initialized. Call getDatabase() first.')
  }

  // Try multiple possible paths for migrations folder
  const possiblePaths = [
    // Development path (when running electron-vite dev)
    path.join(process.cwd(), 'src', 'main', 'db', 'migrations'),
    // Production path (relative to built main process)
    path.join(__dirname, 'db', 'migrations'),
    // Alternative production path
    path.join(__dirname, '..', '..', 'src', 'main', 'db', 'migrations')
  ]

  let migrationsFolder: string | null = null
  for (const possiblePath of possiblePaths) {
    if (fs.existsSync(possiblePath)) {
      migrationsFolder = possiblePath
      break
    }
  }

  if (!migrationsFolder) {
    console.log('📦 No migrations folder found in any expected location, skipping migrations')
    console.log('Searched paths:', possiblePaths)
    return
  }

  console.log('🚀 Running database migrations...')
  console.log('📂 Migrations folder:', migrationsFolder)

  try {
    // Verify migrations folder structure
    const files = fs.readdirSync(migrationsFolder)
    const sqlFiles = files.filter((file) => file.endsWith('.sql'))
    console.log(`📋 Found ${sqlFiles.length} migration files in folder`)

    if (sqlFiles.length === 0) {
      console.log('📦 No migration files found, skipping migrations')
      return
    }

    // Check if __drizzle_migrations table exists to see if any migrations have been run before
    const hasMigrationsTable = sqlite
      ?.prepare(
        `
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name='__drizzle_migrations'
    `
      )
      .get()

    const appliedMigrations = hasMigrationsTable
      ? sqlite?.prepare('SELECT hash FROM __drizzle_migrations').all() || []
      : []

    console.log(`📊 Previously applied migrations: ${appliedMigrations.length}`)

    // Run migrations and capture any changes
    const beforeCount = appliedMigrations.length
    migrate(db, { migrationsFolder })

    // Check how many migrations are applied now
    const afterMigrations = sqlite?.prepare('SELECT hash FROM __drizzle_migrations').all() || []
    const newMigrations = afterMigrations.length - beforeCount

    if (newMigrations > 0) {
      console.log(`✅ Applied ${newMigrations} new migration(s) successfully`)
    } else {
      console.log('✅ All migrations are up to date - no new migrations to apply')
    }
  } catch (error) {
    console.error('❌ Migration failed:', error)

    // Add more context to the error
    let errorMessage = 'Unknown migration error'
    if (error instanceof Error) {
      errorMessage = error.message

      // Provide helpful hints for common errors
      if (errorMessage.includes('SQLITE_CORRUPT')) {
        errorMessage +=
          '\n\nThe database file may be corrupted. Try deleting the database file and restarting the application.'
      } else if (errorMessage.includes('SQLITE_BUSY')) {
        errorMessage +=
          '\n\nThe database is locked by another process. Make sure no other instances of the application are running.'
      } else if (errorMessage.includes('SQLITE_READONLY')) {
        errorMessage += '\n\nThe database file is read-only. Check file permissions.'
      }
    }

    throw new Error(`Database migration failed: ${errorMessage}`)
  }
}

export function closeDatabase(): void {
  if (sqlite) {
    sqlite.close()
    sqlite = null
    db = null
  }
}
