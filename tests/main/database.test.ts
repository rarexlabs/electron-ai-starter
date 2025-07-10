import { describe, it, expect } from 'vitest'
import { eq } from 'drizzle-orm'
import { setupDatabaseTest } from './database-helper'
import { settings } from '../../src/main/db/schema'
import { getSetting, setSetting, getAllSettings } from '../../src/main/db/services/settings'

describe('Database Operations', () => {
  const getTestDatabase = setupDatabaseTest()

  describe('Settings Table CRUD Operations', () => {
    it('should insert and retrieve a setting', async () => {
      const db = getTestDatabase()

      // Insert a setting with JSON value
      await db.insert(settings).values({
        key: 'theme',
        value: { mode: 'dark', accent: 'blue' }
      })

      // Retrieve the setting
      const result = await db
        .select({ value: settings.value })
        .from(settings)
        .where(eq(settings.key, 'theme'))
        .limit(1)

      expect(result).toHaveLength(1)
      expect(result[0].value).toEqual({ mode: 'dark', accent: 'blue' })
    })

    it('should update an existing setting using onConflictDoUpdate', async () => {
      const db = getTestDatabase()

      // Insert initial setting
      await db.insert(settings).values({
        key: 'theme',
        value: { mode: 'light' }
      })

      // Update the setting using onConflictDoUpdate (same as setSetting service)
      await db
        .insert(settings)
        .values({
          key: 'theme',
          value: { mode: 'dark' }
        })
        .onConflictDoUpdate({
          target: [settings.key],
          set: { value: { mode: 'dark' } }
        })

      // Verify the update
      const result = await db
        .select({ value: settings.value })
        .from(settings)
        .where(eq(settings.key, 'theme'))
        .limit(1)

      expect(result).toHaveLength(1)
      expect(result[0].value).toEqual({ mode: 'dark' })
    })

    it('should retrieve multiple settings', async () => {
      const db = getTestDatabase()

      // Insert multiple settings
      await db.insert(settings).values([
        { key: 'ui.theme', value: 'dark' },
        { key: 'ui.language', value: 'en' },
        { key: 'ui.fontSize', value: 14 },
        { key: 'other.setting', value: 'value' }
      ])

      // Retrieve all settings
      const result = await db.select({ key: settings.key, value: settings.value }).from(settings)

      expect(result).toHaveLength(4)

      // Convert to object for easier testing
      const settingsMap = result.reduce(
        (acc, row) => {
          acc[row.key] = row.value
          return acc
        },
        {} as Record<string, unknown>
      )

      expect(settingsMap).toEqual({
        'ui.theme': 'dark',
        'ui.language': 'en',
        'ui.fontSize': 14,
        'other.setting': 'value'
      })
    })

    it('should handle non-existent settings gracefully', async () => {
      const db = getTestDatabase()

      // Try to retrieve a setting that doesn't exist
      const result = await db
        .select({ value: settings.value })
        .from(settings)
        .where(eq(settings.key, 'nonexistent'))
        .limit(1)

      expect(result).toHaveLength(0)
    })

    it('should clear all settings from database', async () => {
      const db = getTestDatabase()

      // Insert some test data
      await db.insert(settings).values([
        { key: 'app.theme', value: 'dark' },
        { key: 'user.name', value: 'John' },
        { key: 'system.version', value: '1.0.0' }
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
        key: 'theme',
        value: 'light'
      })

      // Try to insert duplicate (should fail without onConflictDoUpdate)
      await expect(
        db.insert(settings).values({
          key: 'theme',
          value: 'dark'
        })
      ).rejects.toThrow()

      // Verify original value is unchanged
      const result = await db
        .select({ value: settings.value })
        .from(settings)
        .where(eq(settings.key, 'theme'))

      expect(result[0].value).toBe('light')
    })

    it('should support hierarchical key naming', async () => {
      const db = getTestDatabase()

      // Insert hierarchical keys
      await db.insert(settings).values([
        { key: 'ai.provider', value: 'openai' },
        { key: 'ai.model', value: 'gpt-4' },
        { key: 'ui.theme', value: 'dark' },
        { key: 'ui.language', value: 'en' }
      ])

      // Verify each key has its own value
      const aiProvider = await db
        .select({ value: settings.value })
        .from(settings)
        .where(eq(settings.key, 'ai.provider'))

      const uiTheme = await db
        .select({ value: settings.value })
        .from(settings)
        .where(eq(settings.key, 'ui.theme'))

      expect(aiProvider[0].value).toBe('openai')
      expect(uiTheme[0].value).toBe('dark')
    })
  })

  describe('Database Connection and Schema', () => {
    it('should have settings table with correct schema', async () => {
      const db = getTestDatabase()
      const tableInfo = await db.all(`PRAGMA table_info(settings)`)

      expect(tableInfo).toHaveLength(2)
      const columnNames = tableInfo.map((col: { name: string }) => col.name)
      expect(columnNames).toEqual(['key', 'value'])
    })

    it('should use memory journal mode for in-memory database', async () => {
      const db = getTestDatabase()
      const journalMode = await db.get(`PRAGMA journal_mode`)
      expect(journalMode.journal_mode).toBe('memory')
    })
  })
})

describe('Settings Service Pattern', () => {
  const getTestDatabase = setupDatabaseTest()

  it('should support service-like operations with JSON values', async () => {
    const db = getTestDatabase()

    // Test service operations with JSON values
    await setSetting('test.complex', { nested: { value: 'data' }, array: [1, 2, 3] }, db)
    const retrieved = await getSetting('test.complex', db)
    expect(retrieved).toEqual({ nested: { value: 'data' }, array: [1, 2, 3] })

    await setSetting('test.simple', 'simple string', db)
    expect(await getSetting('test.simple', db)).toBe('simple string')

    await setSetting('test.number', 42, db)
    expect(await getSetting('test.number', db)).toBe(42)

    expect(await getSetting('test.nonexistent', db)).toBe(null)
  })

  it('should support getAllSettings function', async () => {
    const db = getTestDatabase()

    // Insert test data
    await setSetting('key1', 'value1', db)
    await setSetting('key2', { nested: 'value2' }, db)
    await setSetting('key3', 123, db)

    const allSettings = await getAllSettings(db)

    // Check that our test data is present
    expect(allSettings.key1).toBe('value1')
    expect(allSettings.key2).toEqual({ nested: 'value2' })
    expect(allSettings.key3).toBe(123)
  })
})
