import { ipcMain, shell } from 'electron'
import { dirname } from 'path'
import {
  getSetting,
  setSetting,
  getAllSettings,
  clearSetting,
  clearDatabase
} from '../db/services/settings'
import { getDatabasePath, getLogPath } from './paths'
import { mainLogger } from './logger'
import { streamAIResponse, getAvailableModels, testConnection } from './ai-chat-handler'
import type { AIProvider, AIMessage, AIStreamSession } from '../../types/ai'

// Track active AI chat sessions
const activeSessions = new Map<string, AIStreamSession>()

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
  ipcMain.handle('ai-chat-stream', async (event, messages: AIMessage[], provider?: AIProvider) => {
    const sessionId = Date.now().toString()
    const abortController = new AbortController()

    try {
      // Create and store session
      const session: AIStreamSession = {
        id: sessionId,
        provider: provider || 'openai',
        messages,
        abortController,
        createdAt: new Date()
      }
      activeSessions.set(sessionId, session)

      // Start streaming in the background
      const streamGenerator = streamAIResponse(messages, provider, abortController.signal)

      // Process stream chunks
      ;(async () => {
        try {
          for await (const chunk of streamGenerator) {
            // Check if session was aborted
            if (abortController.signal.aborted) {
              event.sender.send('ai-chat-aborted', sessionId)
              break
            }
            event.sender.send('ai-chat-chunk', sessionId, chunk)
          }
          // Signal end of stream if not aborted
          if (!abortController.signal.aborted) {
            event.sender.send('ai-chat-end', sessionId)
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'

          // Check if error is due to abort
          if (error instanceof Error && error.name === 'AbortError') {
            mainLogger.info(`🚫 AI chat stream was aborted for session: ${sessionId}`)
            event.sender.send('ai-chat-aborted', sessionId)
          } else {
            mainLogger.error('AI chat stream error:', error)
            event.sender.send('ai-chat-error', sessionId, errorMessage)
          }
        } finally {
          // Clean up session
          activeSessions.delete(sessionId)
        }
      })()

      return sessionId
    } catch (error) {
      mainLogger.error('AI chat stream error:', error)
      // Clean up session on error
      activeSessions.delete(sessionId)
      throw error
    }
  })

  // AI Chat abort handler
  ipcMain.handle('ai-chat-abort', async (_, sessionId: string) => {
    const session = activeSessions.get(sessionId)
    if (session) {
      mainLogger.info(
        `🚫 ABORT REQUESTED - Aborting AI chat session: ${sessionId} (${session.provider})`
      )
      mainLogger.info(`🚫 Triggering AbortController.abort() to cancel AI provider request`)
      session.abortController.abort()
      activeSessions.delete(sessionId)
      mainLogger.info(`🚫 Session ${sessionId} cleaned up and removed from active sessions`)
    } else {
      mainLogger.warn(`❌ Attempted to abort non-existent session: ${sessionId}`)
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
