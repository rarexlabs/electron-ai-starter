import { drizzle } from 'drizzle-orm/better-sqlite3'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import Database from 'better-sqlite3'
import * as path from 'path'
import * as fs from 'fs'
import { sql } from 'drizzle-orm'
import logger from '../logger'
import { getDatabasePath } from '../paths'

let db: ReturnType<typeof drizzle> | null = null

export function getDatabase(): ReturnType<typeof drizzle> {
  if (!db) {
    const dbPath = getDatabasePath()
    logger.info(`🗄️ Database: ${path.resolve(path.dirname(dbPath))}`)

    const dbDir = path.dirname(dbPath)
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true })
    }

    const sqlite = new Database(dbPath)
    db = drizzle({ client: sqlite })

    // Enable WAL mode for better performance (recommended by better-sqlite3 docs)
    db.run(sql`PRAGMA journal_mode = WAL`)
  }

  return db
}

export function runMigrations(): void {
  if (!db) {
    throw new Error('Database not initialized. Call getDatabase() first.')
  }

  const migrationsFolder = getMigrationsFolder()
  if (!migrationsFolder) {
    logger.info('📦 No migrations folder found, skipping migrations')
    return
  }

  logger.info('🚀 Running migrations...')

  try {
    const beforeCount = getAppliedMigrationsCount()
    migrate(db, { migrationsFolder })
    const afterCount = getAppliedMigrationsCount()
    const newMigrations = afterCount - beforeCount

    if (newMigrations > 0) {
      logger.info(`✅ Applied ${newMigrations} new migration(s)`)
    } else {
      logger.info('✅ Migrations up to date')
    }
  } catch (error) {
    logger.error('❌ Migration failed:', error)
    throw new Error(`Database migration failed: ${getMigrationErrorMessage(error)}`)
  }
}

function getMigrationsFolder(): string | null {
  const possiblePaths = [
    path.join(process.cwd(), 'src', 'backend', 'db', 'migrations'),
    path.join(__dirname, 'migrations'),
    path.join(__dirname, '..', '..', 'src', 'backend', 'db', 'migrations')
  ]

  return possiblePaths.find(fs.existsSync) || null
}

function getAppliedMigrationsCount(): number {
  if (!db) return 0

  try {
    // Check if migrations table exists
    const tableCheck = db.get(sql`SELECT name FROM sqlite_master WHERE type='table' AND name='__drizzle_migrations'`) as any
    
    if (!tableCheck) return 0

    // Count applied migrations
    const result = db.get(sql`SELECT COUNT(*) as count FROM __drizzle_migrations`) as any
    return result?.count || 0
  } catch (error) {
    // If table doesn't exist or other error, return 0
    return 0
  }
}

function getMigrationErrorMessage(error: unknown): string {
  if (!(error instanceof Error)) return 'Unknown migration error'

  let message = error.message
  if (message.includes('SQLITE_CORRUPT')) {
    message +=
      '\n\nThe database file may be corrupted. Try deleting the database file and restarting the application.'
  } else if (message.includes('SQLITE_BUSY')) {
    message +=
      '\n\nThe database is locked by another process. Make sure no other instances of the application are running.'
  } else if (message.includes('SQLITE_READONLY')) {
    message += '\n\nThe database file is read-only. Check file permissions.'
  }

  return message
}

export function testDatabaseConnection(): boolean {
  try {
    getDatabase().run(sql`SELECT 1 as test`)
    logger.info('✅ Database connected')
    return true
  } catch (error) {
    logger.error('❌ Database connection failed:', error)
    return false
  }
}

export function closeDatabase(): void {
  if (db) {
    // Access the underlying SQLite client via Drizzle's $client property
    const client = db.$client
    if (client && typeof client.close === 'function') {
      client.close()
    }
    db = null
  }
}

export function removeDatabaseFile(): void {
  const dbPath = getDatabasePath()
  if (fs.existsSync(dbPath)) {
    fs.unlinkSync(dbPath)
  }
}
