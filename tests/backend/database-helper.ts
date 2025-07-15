import { drizzle } from 'drizzle-orm/libsql'
import { createClient } from '@libsql/client'
import { sql } from 'drizzle-orm'
import { beforeEach } from 'vitest'

/**
 * Creates a fresh in-memory test database with schema setup
 */
export async function createTestDatabase(): Promise<ReturnType<typeof drizzle>> {
  // Create in-memory libSQL database
  const client = createClient({ url: ':memory:' })

  // Create Drizzle instance
  const testDb = drizzle({ client })

  // Create settings table manually for test database
  await testDb.run(sql`CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY NOT NULL,
    value TEXT NOT NULL
  )`)

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
