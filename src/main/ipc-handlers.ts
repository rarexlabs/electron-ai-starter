import { ipcMain, shell } from 'electron'
import { dirname } from 'path'
import { getSetting, setSetting, getAllSettings, clearSetting, clearDatabase } from './settings'
import { getDatabasePath, getLogPath } from './paths'
import { mainLogger } from './logger'
import { processAIChat, abortAIChat, getAvailableModels, testConnection } from './ai'
import type { AIProvider } from '../types/ai'

export function setupIpcHandlers(): void {
  // Database IPC handlers
  ipcMain.handle('get-setting', async (_, key: string) => {
    return getSetting(key)
  })

  ipcMain.handle('set-setting', async (_, key: string, value: unknown) => {
    return setSetting(key, value)
  })

  ipcMain.handle('get-all-settings', async () => {
    return getAllSettings()
  })

  ipcMain.handle('clear-setting', async (_, key: string) => {
    return clearSetting(key)
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

  // AI Chat IPC handlers
  ipcMain.handle('stream-ai-chat', async (event, messages, provider?: AIProvider) => {
    try {
      return await processAIChat(messages, provider, event)
    } catch (error) {
      mainLogger.error('AI chat stream error:', error)
      throw error
    }
  })

  // AI Chat abort handler
  ipcMain.handle('abort-ai-chat', async (_, sessionId: string) => {
    const success = abortAIChat(sessionId)
    if (success) {
      mainLogger.info(`🚫 AI chat session ${sessionId} successfully aborted`)
    } else {
      mainLogger.warn(`❌ Attempted to abort non-existent session: ${sessionId}`)
    }
  })

  ipcMain.handle('get-ai-models', async (_, provider: AIProvider) => {
    try {
      return await getAvailableModels(provider)
    } catch (error) {
      mainLogger.error('Failed to get AI models:', error)
      throw error
    }
  })

  ipcMain.handle('test-ai-provider-connection', async (_, provider: AIProvider) => {
    try {
      return await testConnection(provider)
    } catch (error) {
      mainLogger.error('AI connection test failed:', error)
      return false
    }
  })

  // IPC test
  ipcMain.on('ping', () => mainLogger.info('pong'))
}
