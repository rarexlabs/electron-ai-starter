import { eq } from 'drizzle-orm'
import { db } from './db'
import { settings } from './db/schema'

export async function getSetting<T>(key: string): Promise<T> {
  const result = await db
    .select({ value: settings.value })
    .from(settings)
    .where(eq(settings.key, key))
    .limit(1)

  return result[0]?.value as T
}

export async function setSetting(key: string, value: unknown): Promise<void> {
  await db
    .insert(settings)
    .values({ key, value })
    .onConflictDoUpdate({
      target: [settings.key],
      set: { value }
    })
}

export async function getAllSettings(): Promise<Record<string, unknown>> {
  const result = await db.select({ key: settings.key, value: settings.value }).from(settings)

  return result.reduce(
    (acc, row) => {
      acc[row.key] = row.value
      return acc
    },
    {} as Record<string, unknown>
  )
}

export async function clearSetting(key: string): Promise<void> {
  await db.delete(settings).where(eq(settings.key, key))
}
