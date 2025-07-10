import { eq } from 'drizzle-orm'
import { getDatabase, closeDatabase, removeDatabaseFile } from '../connection'
import { settings } from '../schema'
import { app } from 'electron'

export async function getSetting(
  key: string,
  db?: ReturnType<typeof getDatabase>
): Promise<unknown> {
  const database = db || getDatabase()
  const result = await database
    .select({ value: settings.value })
    .from(settings)
    .where(eq(settings.key, key))
    .limit(1)

  return result[0]?.value || null
}

export async function setSetting(
  key: string,
  value: unknown,
  db?: ReturnType<typeof getDatabase>
): Promise<void> {
  const database = db || getDatabase()
  await database
    .insert(settings)
    .values({ key, value })
    .onConflictDoUpdate({
      target: [settings.key],
      set: { value }
    })
}

export async function getAllSettings(
  db?: ReturnType<typeof getDatabase>
): Promise<Record<string, unknown>> {
  const database = db || getDatabase()
  const result = await database.select({ key: settings.key, value: settings.value }).from(settings)

  return result.reduce(
    (acc, row) => {
      acc[row.key] = row.value
      return acc
    },
    {} as Record<string, unknown>
  )
}

export async function clearDatabase(): Promise<void> {
  closeDatabase()
  removeDatabaseFile()
  app.quit()
}
