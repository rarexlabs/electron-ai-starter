import { Connection } from '@common/connection'
import type { MessagePortMain } from 'electron'
import type { Result, BackendMainAPI, AIProvider, AIConfig, AISettings, AIMessage } from '@common/types'
import { dirname } from 'path'
import { getSetting, setSetting, getAllSettings, clearSetting, clearDatabase } from './settings'
import { getDatabasePath, getLogPath } from './paths'
import { backendLogger } from './logger'
import { streamText, abortStream, listAvailableModel, testConnection } from './ai'
import { FACTORY } from './ai/factory'

/**
 * This class encapsulate the main logic of the backend thread.
 * It keeps 2 state:
 *
 *  1. A single connection to the main thread
 *  2. A list of connections to renderers
 */
export class Server {
  private _mainConnection: Connection
  private _rendererConnections: Connection[] = []

  constructor(parentPort: Electron.ParentPort) {
    this._mainConnection = new Connection(parentPort)
  }

  /**
   * Connect a renderer's port and setup listeners to handle all invoke request
   * coming from that renderer.
   */
  connectRenderer(port: MessagePortMain): Connection {
    const connection = new Connection(port)
    this._rendererConnections.push(connection)

    // Handle ping requests
    connection.handle('ping', async () => {
      return { status: 'success', data: 'pong' }
    })

    // Handle test requests
    connection.handle('test', async (...args) => {
      const message = args[0] as string
      return { status: 'success', data: `Echo: ${message}` }
    })

    // Handle error test requests
    connection.handle('error-test', async () => {
      return { status: 'error', error: new Error('Test error from backend') }
    })

    // Database handlers
    connection.handle('get-setting', async (...args) => {
      try {
        const key = args[0] as string
        const result = await getSetting(key)
        return { status: 'success', data: result }
      } catch (error) {
        return { status: 'error', error }
      }
    })

    connection.handle('set-setting', async (...args) => {
      try {
        const key = args[0] as string
        const value = args[1] as unknown
        await setSetting(key, value)
        return { status: 'success', data: undefined }
      } catch (error) {
        return { status: 'error', error }
      }
    })

    connection.handle('get-all-settings', async () => {
      try {
        const result = await getAllSettings()
        return { status: 'success', data: result }
      } catch (error) {
        return { status: 'error', error }
      }
    })

    connection.handle('clear-setting', async (...args) => {
      try {
        const key = args[0] as string
        await clearSetting(key)
        return { status: 'success', data: undefined }
      } catch (error) {
        return { status: 'error', error }
      }
    })

    connection.handle('clear-database', async () => {
      try {
        await clearDatabase()
        return { status: 'success', data: undefined }
      } catch (error) {
        return { status: 'error', error }
      }
    })

    connection.handle('get-database-path', async () => {
      try {
        const dbPath = getDatabasePath()
        return { status: 'success', data: dirname(dbPath) }
      } catch (error) {
        backendLogger.error('Failed to get database path:', error)
        return { status: 'error', error }
      }
    })

    connection.handle('get-log-path', async () => {
      try {
        const logPath = getLogPath()
        return { status: 'success', data: logPath }
      } catch (error) {
        backendLogger.error('Failed to get log path:', error)
        return { status: 'error', error }
      }
    })

    // AI handlers
    connection.handle('stream-ai-chat', async (messages: AIMessage[]) => {
      try {
        // Get AI settings from database
        const aiSettings = await getSetting<AISettings>('ai')

        if (!aiSettings) throw new Error('No AI setting has been created')

        if (!aiSettings.default_provider)
          throw new Error('No default AI provider found in the settings')

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

        // Create a send function that forwards events through the connection
        const send = (channel: string, ...eventArgs: unknown[]) => {
          // Convert the arguments to a JSON string for compatibility
          const payload = JSON.stringify(eventArgs)
          connection.publishEvent(channel, payload)
        }

        const sessionId = await streamText(config, messages, send)
        return { status: 'success', data: sessionId }
      } catch (error) {
        backendLogger.error('AI chat stream error:', error)
        return { status: 'error', error }
      }
    })

    connection.handle('abort-ai-chat', async (...args) => {
      try {
        const sessionId = args[0] as string
        const success = abortStream(sessionId)
        if (success) {
          backendLogger.info(`AI chat session ${sessionId} successfully aborted`)
        } else {
          backendLogger.warn(`❌ Attempted to abort non-existent session: ${sessionId}`)
        }
        return { status: 'success', data: undefined }
      } catch (error) {
        return { status: 'error', error }
      }
    })

    connection.handle('get-ai-models', async (...args) => {
      try {
        const provider = args[0] as AIProvider
        const models = await listAvailableModel(provider)
        return { status: 'success', data: models }
      } catch (error) {
        backendLogger.error('Failed to get AI models:', error)
        return { status: 'error', error }
      }
    })

    connection.handle('test-ai-provider-connection', async (...args) => {
      try {
        const config = args[0] as AIConfig
        const result = await testConnection(config)
        return { status: 'success', data: result }
      } catch (error) {
        backendLogger.error('AI connection test failed:', error)
        return { status: 'success', data: false }
      }
    })

    // Example of listening for events
    connection.onEvent('custom-event', (payload) => {
      // Echo the event back to preload
      connection!.publishEvent('echo-event', `Echo: ${payload}`)
    })

    return connection
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private _invokeMain(channel: string, ...args): Promise<Result<any, any>> {
    return this._mainConnection.invoke(channel, ...args)
  }

  get mainAPI(): BackendMainAPI {
    return {
      osEncrypt: (...args) => this._invokeMain('osEncrypt', ...args),
      osDecrypt: (...args) => this._invokeMain('osDecrypt', ...args)
    }
  }
}
