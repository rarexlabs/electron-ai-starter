import { describe, it, expect } from 'vitest'
import { eq, and } from 'drizzle-orm'
import { setupDatabaseTest } from './database-helper'
import { settings } from '../../src/main/db/schema'

describe('Database Operations', () => {
  const getTestDatabase = setupDatabaseTest()

  describe('Settings Table CRUD Operations', () => {
    it('should insert and retrieve a setting', async () => {
      const db = getTestDatabase()

      // Insert a setting
      await db.insert(settings).values({
        namespace: 'app',
        key: 'theme',
        value: 'dark'
      })

      // Retrieve the setting
      const result = await db
        .select({ value: settings.value })
        .from(settings)
        .where(and(eq(settings.namespace, 'app'), eq(settings.key, 'theme')))
        .limit(1)

      expect(result).toHaveLength(1)
      expect(result[0].value).toBe('dark')
    })

    it('should update an existing setting using onConflictDoUpdate', async () => {
      const db = getTestDatabase()

      // Insert initial setting
      await db.insert(settings).values({
        namespace: 'app',
        key: 'theme',
        value: 'light'
      })

      // Update the setting using onConflictDoUpdate (same as setSetting service)
      await db
        .insert(settings)
        .values({
          namespace: 'app',
          key: 'theme',
          value: 'dark'
        })
        .onConflictDoUpdate({
          target: [settings.namespace, settings.key],
          set: { value: 'dark' }
        })

      // Verify the update
      const result = await db
        .select({ value: settings.value })
        .from(settings)
        .where(and(eq(settings.namespace, 'app'), eq(settings.key, 'theme')))
        .limit(1)

      expect(result).toHaveLength(1)
      expect(result[0].value).toBe('dark')
    })

    it('should retrieve multiple settings by namespace', async () => {
      const db = getTestDatabase()

      // Insert multiple settings in the same namespace
      await db.insert(settings).values([
        { namespace: 'ui', key: 'theme', value: 'dark' },
        { namespace: 'ui', key: 'language', value: 'en' },
        { namespace: 'ui', key: 'fontSize', value: '14' },
        { namespace: 'other', key: 'setting', value: 'value' }
      ])

      // Retrieve all settings for 'ui' namespace
      const result = await db
        .select({ key: settings.key, value: settings.value })
        .from(settings)
        .where(eq(settings.namespace, 'ui'))

      expect(result).toHaveLength(3)

      // Convert to object for easier testing
      const settingsMap = result.reduce(
        (acc, row) => {
          acc[row.key] = row.value
          return acc
        },
        {} as Record<string, string>
      )

      expect(settingsMap).toEqual({
        theme: 'dark',
        language: 'en',
        fontSize: '14'
      })
    })

    it('should handle non-existent settings gracefully', async () => {
      const db = getTestDatabase()

      // Try to retrieve a setting that doesn't exist
      const result = await db
        .select({ value: settings.value })
        .from(settings)
        .where(and(eq(settings.namespace, 'nonexistent'), eq(settings.key, 'key')))
        .limit(1)

      expect(result).toHaveLength(0)
    })

    it('should clear all settings from database', async () => {
      const db = getTestDatabase()

      // Insert some test data
      await db.insert(settings).values([
        { namespace: 'app', key: 'theme', value: 'dark' },
        { namespace: 'user', key: 'name', value: 'John' },
        { namespace: 'system', key: 'version', value: '1.0.0' }
      ])

      // Verify data exists
      const beforeClear = await db.select().from(settings)
      expect(beforeClear).toHaveLength(3)

      // Clear all data
      await db.delete(settings)

      // Verify data is cleared
      const afterClear = await db.select().from(settings)
      expect(afterClear).toHaveLength(0)
    })

    it('should handle primary key constraints correctly', async () => {
      const db = getTestDatabase()

      // Insert a setting
      await db.insert(settings).values({
        namespace: 'app',
        key: 'theme',
        value: 'light'
      })

      // Try to insert duplicate (should fail without onConflictDoUpdate)
      await expect(
        db.insert(settings).values({
          namespace: 'app',
          key: 'theme',
          value: 'dark'
        })
      ).rejects.toThrow()

      // Verify original value is unchanged
      const result = await db
        .select({ value: settings.value })
        .from(settings)
        .where(and(eq(settings.namespace, 'app'), eq(settings.key, 'theme')))

      expect(result[0].value).toBe('light')
    })

    it('should support multiple namespaces with same keys', async () => {
      const db = getTestDatabase()

      // Insert same key in different namespaces
      await db.insert(settings).values([
        { namespace: 'app', key: 'theme', value: 'dark' },
        { namespace: 'user', key: 'theme', value: 'light' },
        { namespace: 'admin', key: 'theme', value: 'blue' }
      ])

      // Verify each namespace has its own value
      const appTheme = await db
        .select({ value: settings.value })
        .from(settings)
        .where(and(eq(settings.namespace, 'app'), eq(settings.key, 'theme')))

      const userTheme = await db
        .select({ value: settings.value })
        .from(settings)
        .where(and(eq(settings.namespace, 'user'), eq(settings.key, 'theme')))

      const adminTheme = await db
        .select({ value: settings.value })
        .from(settings)
        .where(and(eq(settings.namespace, 'admin'), eq(settings.key, 'theme')))

      expect(appTheme[0].value).toBe('dark')
      expect(userTheme[0].value).toBe('light')
      expect(adminTheme[0].value).toBe('blue')
    })
  })

  describe('Database Connection and Schema', () => {
    it('should have settings table with correct schema', async () => {
      const db = getTestDatabase()
      const tableInfo = await db.all(`PRAGMA table_info(settings)`)

      expect(tableInfo).toHaveLength(3)
      const columnNames = tableInfo.map((col: { name: string }) => col.name)
      expect(columnNames).toEqual(['namespace', 'key', 'value'])
    })

    it('should maintain WAL journal mode', async () => {
      const db = getTestDatabase()
      const journalMode = await db.get(`PRAGMA journal_mode`)
      expect(journalMode.journal_mode).toBe('wal')
    })
  })
})

describe('Settings Service Pattern', () => {
  const getTestDatabase = setupDatabaseTest()

  it('should support service-like operations', async () => {
    const db = getTestDatabase()

    // Helper functions mimicking service layer
    const getSetting = async (namespace: string, key: string): Promise<string | null> => {
      const result = await db
        .select({ value: settings.value })
        .from(settings)
        .where(and(eq(settings.namespace, namespace), eq(settings.key, key)))
        .limit(1)
      return result[0]?.value || null
    }

    const setSetting = async (namespace: string, key: string, value: string): Promise<void> => {
      await db
        .insert(settings)
        .values({ namespace, key, value })
        .onConflictDoUpdate({
          target: [settings.namespace, settings.key],
          set: { value }
        })
    }

    // Test service operations
    await setSetting('test', 'setting1', 'value1')
    expect(await getSetting('test', 'setting1')).toBe('value1')

    await setSetting('test', 'setting1', 'updatedValue')
    expect(await getSetting('test', 'setting1')).toBe('updatedValue')

    expect(await getSetting('test', 'nonexistent')).toBe(null)
  })
})
