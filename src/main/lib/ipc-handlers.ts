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
import { streamAIResponse, getAvailableModels, testConnection, type AIProvider, type AIMessage } from './ai-chat-handler'

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

  // AI Chat IPC handlers
  ipcMain.handle('ai-chat-stream', async (event, messages: AIMessage[], provider?: AIProvider) => {
    const sessionId = Date.now().toString()
    
    try {
      // Start streaming in the background
      const streamGenerator = streamAIResponse(messages, provider)
      
      // Process stream chunks
      ;(async () => {
        try {
          for await (const chunk of streamGenerator) {
            event.sender.send('ai-chat-chunk', sessionId, chunk)
          }
          // Signal end of stream
          event.sender.send('ai-chat-end', sessionId)
        } catch (error) {
          mainLogger.error('AI chat stream error:', error)
          const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
          event.sender.send('ai-chat-error', sessionId, errorMessage)
        }
      })()
      
      return sessionId
    } catch (error) {
      mainLogger.error('AI chat stream error:', error)
      throw error
    }
  })

  ipcMain.handle('ai-get-models', async (_, provider: AIProvider) => {
    try {
      return await getAvailableModels(provider)
    } catch (error) {
      mainLogger.error('Failed to get AI models:', error)
      throw error
    }
  })

  ipcMain.handle('ai-test-connection', async (_, provider: AIProvider) => {
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
