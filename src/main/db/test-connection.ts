import { getDatabase } from './connection'
import { sql } from 'drizzle-orm'

export function testDatabaseConnection(): boolean {
  try {
    const db = getDatabase()

    // Test that we can execute a simple query without requiring any tables
    // For better-sqlite3, use synchronous .run() method
    db.run(sql`SELECT 1 as test`)
    console.log('✅ Database connection successful')
    console.log(
      '📍 Database path:',
      process.env.DB_PATH || import.meta.env.MAIN_VITE_DB_PATH || 'userData/worthyfiles.db'
    )

    return true
  } catch (error) {
    console.error('❌ Database connection failed:', error)
    return false
  }
}
