import { ipcMain, shell } from 'electron'
import { dirname } from 'path'
import { getSetting, setSetting, getAllSettings, clearSetting, clearDatabase } from './settings'
import { getDatabasePath, getLogPath } from './paths'
import { mainLogger } from './logger'
import { streamAIResponse, getAvailableModels, testConnection } from './ai-chat-handler'
import type { AIProvider, AIMessage, AIStreamSession } from '../types/ai'

// Track active AI chat sessions
const activeSessions = new Map<string, AIStreamSession>()

// Helper functions for AI chat handling
function createAISession(messages: AIMessage[], provider?: AIProvider): AIStreamSession {
  const sessionId = Date.now().toString()
  const abortController = new AbortController()

  const session: AIStreamSession = {
    id: sessionId,
    provider: provider || 'openai',
    messages,
    abortController,
    createdAt: new Date()
  }

  activeSessions.set(sessionId, session)
  return session
}

function cleanupSession(sessionId: string): void {
  activeSessions.delete(sessionId)
}

function handleStreamError(
  error: unknown,
  sessionId: string,
  event: Electron.IpcMainInvokeEvent
): void {
  const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'

  // Check if error is due to abort
  if (error instanceof Error && error.name === 'AbortError') {
    mainLogger.info(`🚫 AI chat stream was aborted for session: ${sessionId}`)
    event.sender.send('ai-chat-aborted', sessionId)
  } else {
    mainLogger.error('AI chat stream error:', error)
    event.sender.send('ai-chat-error', sessionId, errorMessage)
  }
}

async function processAIStream(
  session: AIStreamSession,
  event: Electron.IpcMainInvokeEvent,
  streamGenerator: AsyncGenerator<string, void, unknown>
): Promise<void> {
  try {
    for await (const chunk of streamGenerator) {
      // Check if session was aborted
      if (session.abortController.signal.aborted) {
        event.sender.send('ai-chat-aborted', session.id)
        break
      }
      event.sender.send('ai-chat-chunk', session.id, chunk)
    }
    // Signal end of stream if not aborted
    if (!session.abortController.signal.aborted) {
      event.sender.send('ai-chat-end', session.id)
    }
  } catch (error) {
    handleStreamError(error, session.id, event)
  } finally {
    // Clean up session
    cleanupSession(session.id)
  }
}

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
  ipcMain.handle('stream-ai-chat', async (event, messages: AIMessage[], provider?: AIProvider) => {
    try {
      // Create and store session
      const session = createAISession(messages, provider)

      // Start streaming in the background
      const streamGenerator = streamAIResponse(messages, provider, session.abortController.signal)

      // Process stream chunks asynchronously
      processAIStream(session, event, streamGenerator)

      return session.id
    } catch (error) {
      mainLogger.error('AI chat stream error:', error)
      throw error
    }
  })

  // AI Chat abort handler
  ipcMain.handle('abort-ai-chat', async (_, sessionId: string) => {
    const session = activeSessions.get(sessionId)
    if (session) {
      mainLogger.info(
        `🚫 ABORT REQUESTED - Aborting AI chat session: ${sessionId} (${session.provider})`
      )
      mainLogger.info(`🚫 Triggering AbortController.abort() to cancel AI provider request`)
      session.abortController.abort()
      cleanupSession(sessionId)
      mainLogger.info(`🚫 Session ${sessionId} cleaned up and removed from active sessions`)
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
