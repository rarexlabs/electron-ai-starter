import { text, sqliteTable, primaryKey } from 'drizzle-orm/sqlite-core'
import { type InferSelectModel, type InferInsertModel } from 'drizzle-orm'

// Settings table for app configuration (key-value pairs with namespace)
export const settings = sqliteTable(
  'settings',
  {
    namespace: text('namespace').notNull(),
    key: text('key').notNull(),
    value: text('value').notNull()
  },
  (table) => ({
    pk: primaryKey({ columns: [table.namespace, table.key] })
  })
)

// TypeScript types for settings table
export type SelectSetting = InferSelectModel<typeof settings>
export type InsertSetting = InferInsertModel<typeof settings>
