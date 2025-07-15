import { Connection } from '@common/connection'
import type { MessagePortMain } from 'electron'
import type {
  Result,
  BackendMainAPI,
  AIProvider,
  AIConfig,
  AISettings,
  AIMessage,
  AppEvent
} from '@common/types'
import { ok, error } from '@common/result'
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
      return ok('pong')
    })

    // Database handlers
    connection.handle('get-setting', async (key: string) => {
      try {
        const result = await getSetting(key)
        return ok(result)
      } catch (err) {
        return error(err)
      }
    })

    connection.handle('set-setting', async (key: string, value: unknown) => {
      try {
        await setSetting(key, value)
        return ok(undefined)
      } catch (err) {
        return error(err)
      }
    })

    connection.handle('get-all-settings', async () => {
      try {
        const result = await getAllSettings()
        return ok(result)
      } catch (err) {
        return error(err)
      }
    })

    connection.handle('clear-setting', async (key: string) => {
      try {
        await clearSetting(key)
        return ok(undefined)
      } catch (err) {
        return error(err)
      }
    })

    connection.handle('clear-database', async () => {
      try {
        await clearDatabase()
        return ok(undefined)
      } catch (err) {
        return error(err)
      }
    })

    connection.handle('get-database-path', async () => {
      try {
        const dbPath = getDatabasePath()
        return ok(dirname(dbPath))
      } catch (err) {
        backendLogger.error('Failed to get database path:', err)
        return error(err)
      }
    })

    connection.handle('get-log-path', async () => {
      try {
        const logPath = getLogPath()
        return ok(logPath)
      } catch (err) {
        backendLogger.error('Failed to get log path:', err)
        return error(err)
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

        const sessionId = await streamText(config, messages, (channel: string, event: AppEvent) => {
          connection.publishEvent(channel, event)
        })
        return ok(sessionId)
      } catch (err) {
        backendLogger.error('AI chat stream error:', err)
        return error(err)
      }
    })

    connection.handle('abort-ai-chat', async (sessionId: string) => {
      try {
        const success = abortStream(sessionId)
        if (success) {
          backendLogger.info(`AI chat session ${sessionId} successfully aborted`)
        } else {
          backendLogger.warn(`❌ Attempted to abort non-existent session: ${sessionId}`)
        }
        return ok(undefined)
      } catch (err) {
        return error(err)
      }
    })

    connection.handle('get-ai-models', async (provider: AIProvider) => {
      try {
        const models = await listAvailableModel(provider)
        return ok(models)
      } catch (err) {
        backendLogger.error('Failed to get AI models:', err)
        return error(err)
      }
    })

    connection.handle('test-ai-provider-connection', async (config: AIConfig) => {
      try {
        const result = await testConnection(config)
        return ok(result)
      } catch (err) {
        backendLogger.error('AI connection test failed:', err)
        return ok(false)
      }
    })

    return connection
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private _invokeMain(channel: string, ...args: unknown[]): Promise<Result<any, any>> {
    return this._mainConnection.invoke(channel, ...args)
  }

  get mainAPI(): BackendMainAPI {
    return {
      osEncrypt: (...args) => this._invokeMain('osEncrypt', ...args),
      osDecrypt: (...args) => this._invokeMain('osDecrypt', ...args)
    }
  }
}
