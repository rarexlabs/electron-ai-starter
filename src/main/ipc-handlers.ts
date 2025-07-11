import { ipcMain, shell } from 'electron'
import { dirname } from 'path'
import { getSetting, setSetting, getAllSettings, clearSetting, clearDatabase } from './settings'
import { getDatabasePath, getLogPath } from './paths'
import { mainLogger } from './logger'
import { streamAIChat, abortAIChat, listAvailableModel, testConnection } from './ai'
import type { AIProvider, AIConfig, AISettings } from '@common/types'
import { FACTORY } from './ai/factory'

export function setupIpcHandlers(): void {
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

  ipcMain.handle('stream-ai-chat', async (event, messages) => {
    try {
      // Get AI settings from database
      const aiSettings = await getSetting<AISettings>('ai')

      if (!aiSettings) throw new Error(`No AI setting has been created`)

      if (!aiSettings.default_provider)
        throw new Error(`No default AI provider founder in the settings`)

      // Determine which provider to use
      const selectedProvider = aiSettings.default_provider!

      // Get API key for the selected provider
      const apiKeyField = `${selectedProvider}_api_key` as keyof AISettings
      const apiKey = aiSettings[apiKeyField] as string

      if (!apiKey) {
        throw new Error(`API key not found for provider: ${selectedProvider}`)
      }

      // Get model for the selected provider
      const modelField = `${selectedProvider}_model` as keyof AISettings
      const model = (aiSettings[modelField] as string) || FACTORY[selectedProvider].default

      // Create config object
      const config: AIConfig = {
        provider: selectedProvider,
        model,
        apiKey
      }

      return await streamAIChat(messages, config, event.sender.send.bind(event.sender))
    } catch (error) {
      mainLogger.error('AI chat stream error:', error)
      throw error
    }
  })

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
      return await listAvailableModel(provider)
    } catch (error) {
      mainLogger.error('Failed to get AI models:', error)
      throw error
    }
  })

  ipcMain.handle('test-ai-provider-connection', async (_, config: AIConfig) => {
    try {
      return await testConnection(config)
    } catch (error) {
      mainLogger.error('AI connection test failed:', error)
      return false
    }
  })

  ipcMain.on('ping', () => mainLogger.info('pong'))
}
