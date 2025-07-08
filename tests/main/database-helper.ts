import { drizzle } from 'drizzle-orm/better-sqlite3'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import Database from 'better-sqlite3'
import * as path from 'path'
import * as fs from 'fs'
import { afterEach, beforeEach } from 'vitest'
import { config } from 'dotenv'

// Load .env file for test environment
config()

const TEST_DB_FOLDER = process.env.TEST_DB_FOLDER || process.env.MAIN_VITE_DB_FOLDER
if (!TEST_DB_FOLDER) {
  throw new Error(
    'Database folder is required for tests. Please set either TEST_DB_FOLDER or MAIN_VITE_DB_FOLDER environment variable.'
  )
}
const TEST_DB_PATH = path.join(TEST_DB_FOLDER, 'test.db')
const MIGRATIONS_PATH = path.join(process.cwd(), 'src', 'main', 'db', 'migrations')

let testSqlite: Database.Database | null = null

/**
 * Creates a fresh test database connection with migrations applied
 */
export function createTestDatabase(): ReturnType<typeof drizzle> {
  // Ensure tmp directory exists and remove existing test database
  const tmpDir = path.dirname(TEST_DB_PATH)
  if (!fs.existsSync(tmpDir)) {
    fs.mkdirSync(tmpDir, { recursive: true })
  }
  if (fs.existsSync(TEST_DB_PATH)) {
    fs.unlinkSync(TEST_DB_PATH)
  }

  // Create SQLite connection with WAL mode (same as production)
  testSqlite = new Database(TEST_DB_PATH)
  testSqlite.pragma('journal_mode = WAL')

  // Create Drizzle instance and apply migrations
  const testDb = drizzle({ client: testSqlite })
  if (fs.existsSync(MIGRATIONS_PATH)) {
    migrate(testDb, { migrationsFolder: MIGRATIONS_PATH })
  }

  return testDb
}

/**
 * Cleans up test database connection and removes test database file
 */
export function cleanupTestDatabase(): void {
  if (testSqlite) {
    testSqlite.close()
    testSqlite = null
  }
  if (fs.existsSync(TEST_DB_PATH)) {
    fs.unlinkSync(TEST_DB_PATH)
  }
}

/**
 * Vitest fixture for database testing
 * Sets up a fresh database before each test and cleans up after
 */
export function setupDatabaseTest() {
  let testDb: ReturnType<typeof drizzle>

  beforeEach(() => {
    testDb = createTestDatabase()
  })

  afterEach(() => {
    cleanupTestDatabase()
  })

  return () => testDb
}
