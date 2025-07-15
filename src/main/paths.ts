import { join, resolve } from 'path'
import { app } from 'electron'

export function getBasePath(): string {
  const isDev = process.env.NODE_ENV === 'development' || import.meta.env.DEV
  const userDataPath = import.meta.env.MAIN_VITE_USER_DATA_PATH

  if (!userDataPath) {
    if (isDev) {
      throw new Error('MAIN_VITE_USER_DATA_PATH env var is required in development.')
    }
    return app.getPath('userData')
  }

  return userDataPath
}

export function getDatabasePath(): string {
  return resolve(join(getBasePath(), 'db', 'app.db'))
}

export function getLogPath(): string {
  return resolve(join(getBasePath(), 'logs'))
}
