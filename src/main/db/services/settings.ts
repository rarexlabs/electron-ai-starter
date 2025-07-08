import { eq, and } from 'drizzle-orm'
import { getDatabase, closeDatabase, removeDatabaseFile } from '../connection'
import { settings } from '../schema'
import { app } from 'electron'

export async function getSetting(namespace: string, key: string): Promise<string | null> {
  const db = getDatabase()
  const result = await db
    .select({ value: settings.value })
    .from(settings)
    .where(and(eq(settings.namespace, namespace), eq(settings.key, key)))
    .limit(1)

  return result[0]?.value || null
}

export async function setSetting(namespace: string, key: string, value: string): Promise<void> {
  const db = getDatabase()
  await db
    .insert(settings)
    .values({ namespace, key, value })
    .onConflictDoUpdate({
      target: [settings.namespace, settings.key],
      set: { value }
    })
}

export async function getSettingsByNamespace(namespace: string): Promise<Record<string, string>> {
  const db = getDatabase()
  const result = await db
    .select({ key: settings.key, value: settings.value })
    .from(settings)
    .where(eq(settings.namespace, namespace))

  return result.reduce(
    (acc, row) => {
      acc[row.key] = row.value
      return acc
    },
    {} as Record<string, string>
  )
}

export async function clearDatabase(): Promise<void> {
  closeDatabase()
  removeDatabaseFile()
  app.quit()
}
