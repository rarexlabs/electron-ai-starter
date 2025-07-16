import { join, resolve } from 'path'
import { getUserDataPath } from './user-data-path'

export function getBasePath(): string {
  return getUserDataPath()
}

export function getDatabasePath(): string {
  return resolve(join(getBasePath(), 'db', 'app.db'))
}

export function getLogPath(): string {
  return resolve(join(getBasePath(), 'logs'))
}
