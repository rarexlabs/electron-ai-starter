import { join, resolve } from 'path'
import { app } from 'electron'

export function getBasePath(): string {
  const isDev = process.env.NODE_ENV === 'development' || import.meta.env.DEV
  const configPath = process.env.DB_PATH || import.meta.env.MAIN_VITE_USER_DATA_PATH

  if (!configPath) {
    if (isDev) {
      throw new Error('Database path is required in development.')
    }
    return app.getPath('userData')
  }

  return configPath
}

export function getDatabasePath(): string {
  return resolve(join(getBasePath(), 'db', 'app.db'))
}

export function getLogPath(): string {
  return resolve(join(getBasePath(), 'logs'))
}
