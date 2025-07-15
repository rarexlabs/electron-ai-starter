import { drizzle } from 'drizzle-orm/libsql'
import { migrate } from 'drizzle-orm/libsql/migrator'
import { createClient } from '@libsql/client'
import * as path from 'path'
import * as fs from 'fs'
import { sql } from 'drizzle-orm'
import logger from '../logger'
import { getDatabasePath } from '../paths'

export function connectDatabase(): ReturnType<typeof drizzle> {
  const dbPath = getDatabasePath()
  logger.info(`🗄️ Database: ${path.resolve(path.dirname(dbPath))}`)

  const dbDir = path.dirname(dbPath)
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true })
  }

  const client = createClient({ url: `file:${dbPath}` })
  return drizzle({ client })
}

export async function runMigrations(database: ReturnType<typeof drizzle>): Promise<void> {
  const migrationsFolder = getMigrationsFolder()
  if (!migrationsFolder) {
    logger.info('📦 No migrations folder found, skipping migrations')
    return
  }

  logger.info('🚀 Running migrations...')

  // Run migrations directly - libsql migrate handles checking if already applied
  await migrate(database, { migrationsFolder })
  logger.info('✅ Migrations completed successfully')
}

function getMigrationsFolder(): string | null {
  const possiblePaths = [
    path.join(process.cwd(), 'src', 'backend', 'db', 'migrations'),
    path.join(__dirname, 'migrations'),
    path.join(__dirname, '..', '..', 'src', 'backend', 'db', 'migrations')
  ]

  return possiblePaths.find(fs.existsSync) || null
}

export async function testConnection(database: ReturnType<typeof drizzle>): Promise<boolean> {
  try {
    await database.run(sql`SELECT 1 as test`)
    logger.info('✅ Database connected')
    return true
  } catch (error) {
    logger.error('❌ Database connection failed:', error)
    return false
  }
}

export function close(db: ReturnType<typeof drizzle>): void {
  db?.$client.close()
}

export function destroy(): void {
  const dbPath = getDatabasePath()
  if (fs.existsSync(dbPath)) {
    fs.unlinkSync(dbPath)
  }
}

export const db = connectDatabase()
