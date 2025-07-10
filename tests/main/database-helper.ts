import { drizzle } from 'drizzle-orm/better-sqlite3'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import Database from 'better-sqlite3'
import * as path from 'path'
import * as fs from 'fs'
import { beforeEach } from 'vitest'

const MIGRATIONS_PATH = path.join(process.cwd(), 'src', 'main', 'db', 'migrations')

/**
 * Creates a fresh in-memory test database with migrations applied
 */
export function createTestDatabase(): ReturnType<typeof drizzle> {
  // Create in-memory SQLite database
  const testSqlite = new Database(':memory:')

  // Create Drizzle instance and apply migrations
  const testDb = drizzle({ client: testSqlite })
  if (fs.existsSync(MIGRATIONS_PATH)) {
    migrate(testDb, { migrationsFolder: MIGRATIONS_PATH })
  }

  return testDb
}

/**
 * Vitest fixture for database testing
 * Sets up a fresh in-memory database before each test
 */
export function setupDatabaseTest() {
  let testDb: ReturnType<typeof drizzle>

  beforeEach(() => {
    testDb = createTestDatabase()
  })

  return () => testDb
}
