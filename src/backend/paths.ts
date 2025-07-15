import { join, resolve } from 'path'

function parseUserDataPath(): string {
  const args = process.argv
  const userDataPathIndex = args.indexOf('--user-data-path')

  if (userDataPathIndex === -1 || userDataPathIndex + 1 >= args.length) {
    throw new Error('user-data-path argument is required but not provided by main process')
  }

  return args[userDataPathIndex + 1]
}

export function getBasePath(): string {
  return parseUserDataPath()
}

export function getDatabasePath(): string {
  return resolve(join(getBasePath(), 'db', 'app.db'))
}

export function getLogPath(): string {
  return resolve(join(getBasePath(), 'logs'))
}
