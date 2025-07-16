import { drizzle } from 'drizzle-orm/libsql'
import { createClient } from '@libsql/client'
import { beforeEach } from 'vitest'
import { runMigrations } from '@backend/db'

/**
 * Creates a fresh in-memory test database with schema setup
 */
export async function createTestDatabase(): Promise<ReturnType<typeof drizzle>> {
  // Create in-memory libSQL database
  const client = createClient({ url: ':memory:' })

  // Create Drizzle instance
  const testDb = drizzle({ client })

  // Run migrations to set up schema (same as production)
  // ?asset import should now work through electron-vite config
  await runMigrations(testDb)

  return testDb
}

/**
 * Vitest fixture for database testing
 * Sets up a fresh in-memory database before each test
 */
export function setupDatabaseTest() {
  let testDb: ReturnType<typeof drizzle>

  beforeEach(async () => {
    testDb = await createTestDatabase()
  })

  return () => testDb
}
