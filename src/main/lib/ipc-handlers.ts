import { ipcMain, shell } from 'electron'
import { dirname } from 'path'
import {
  getSetting,
  setSetting,
  getSettingsByNamespace,
  clearDatabase
} from '../db/services/settings'
import { getDatabasePath, getLogPath } from './paths'
import { mainLogger } from './logger'

export function setupIpcHandlers(): void {
  // Database IPC handlers
  ipcMain.handle('get-setting', async (_, namespace: string, key: string) => {
    return getSetting(namespace, key)
  })

  ipcMain.handle('set-setting', async (_, namespace: string, key: string, value: string) => {
    return setSetting(namespace, key, value)
  })

  ipcMain.handle('get-settings-by-namespace', async (_, namespace: string) => {
    return getSettingsByNamespace(namespace)
  })

  ipcMain.handle('clear-database', async () => {
    return clearDatabase()
  })

  // Path IPC handlers
  ipcMain.handle('get-database-path', async () => {
    try {
      const dbPath = getDatabasePath()
      return dirname(dbPath) // Return the absolute path to the folder containing the database file
    } catch (error) {
      mainLogger.error('Failed to get database path:', error)
      throw error
    }
  })

  ipcMain.handle('get-log-path', async () => {
    try {
      return getLogPath()
    } catch (error) {
      mainLogger.error('Failed to get log path:', error)
      throw error
    }
  })

  ipcMain.handle('open-folder', async (_, folderPath: string) => {
    try {
      await shell.openPath(folderPath)
      mainLogger.info(`Opened folder: ${folderPath}`)
    } catch (error) {
      mainLogger.error('Failed to open folder:', error)
      throw error
    }
  })

  // IPC test
  ipcMain.on('ping', () => mainLogger.info('pong'))
}
