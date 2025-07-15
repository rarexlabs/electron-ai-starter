import { ipcRenderer } from 'electron'
import { Connection } from '../common/connection'
import { isOk } from '../common/result'

// Create scoped logger for preload process using direct IPC
const preloadLogger = {
  info: (message: string, ...args: unknown[]) => {
    ipcRenderer.send('__ELECTRON_LOG__', {
      data: [message, ...args],
      level: 'info',
      scope: 'preload',
      variables: { processType: 'preload' }
    })
  },
  warn: (message: string, ...args: unknown[]) => {
    ipcRenderer.send('__ELECTRON_LOG__', {
      data: [message, ...args],
      level: 'warn',
      scope: 'preload',
      variables: { processType: 'preload' }
    })
  },
  error: (message: string, ...args: unknown[]) => {
    ipcRenderer.send('__ELECTRON_LOG__', {
      data: [message, ...args],
      level: 'error',
      scope: 'preload',
      variables: { processType: 'preload' }
    })
  },
  debug: (message: string, ...args: unknown[]) => {
    ipcRenderer.send('__ELECTRON_LOG__', {
      data: [message, ...args],
      level: 'debug',
      scope: 'preload',
      variables: { processType: 'preload' }
    })
  }
}

// AI Chat API types
export type AIProvider = 'openai' | 'anthropic' | 'google'

export interface AIMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

export interface AIConfig {
  provider: AIProvider
  model: string
  apiKey: string
}

export class Server {
  private _backendConnectionPromise?: Promise<void>
  private _backendConnection: Connection | null = null

  // Main process communication using secure IPC
  public readonly mainAPI = {
    // Only keep non-database/AI operations in main
    openFolder: (folderPath: string): Promise<void> => {
      return ipcRenderer.invoke('open-folder', folderPath)
    },

    // Raw IPC event methods for renderer to handle streaming events
    on: (channel: string, listener: (...args: unknown[]) => void): void => {
      ipcRenderer.on(channel, listener)
    },

    off: (channel: string, listener: (...args: unknown[]) => void): void => {
      ipcRenderer.removeListener(channel, listener)
    }
  }

  // Backend process communication using Connection directly
  public readonly backendAPI = {
    // Backend process communication using Connection directly
    ping: async (): Promise<string> => {
      if (!this._backendConnection) {
        throw new Error('Backend not connected')
      }

      const result = await this._backendConnection.invoke('ping')
      if (isOk(result)) {
        return result.value as string
      } else {
        throw new Error(result.error?.toString() || 'Backend ping failed')
      }
    },

    // Test backend communication with a message
    test: async (message: string): Promise<string> => {
      if (!this._backendConnection) {
        throw new Error('Backend not connected')
      }

      const result = await this._backendConnection.invoke('test', message)
      if (isOk(result)) {
        return result.value as string
      } else {
        throw new Error(result.error?.toString() || 'Backend test failed')
      }
    },

    // Test error handling
    testError: async (): Promise<void> => {
      if (!this._backendConnection) {
        throw new Error('Backend not connected')
      }

      const result = await this._backendConnection.invoke('error-test')
      if (!isOk(result)) {
        throw new Error(result.error?.toString() || 'Backend error test failed')
      }
    },

    // Generic invoke method for custom backend operations
    invoke: async (channel: string, ...args: unknown[]): Promise<unknown> => {
      if (!this._backendConnection) {
        throw new Error('Backend not connected')
      }

      const result = await this._backendConnection.invoke(channel, ...args)
      if (isOk(result)) {
        return result.value
      } else {
        throw new Error(result.error?.toString() || `Backend invoke ${channel} failed`)
      }
    },

    // Publish events to backend
    publishEvent: (channel: string, payload: string): void => {
      if (!this._backendConnection) {
        preloadLogger.warn('⚠️ Cannot publish event - backend not connected')
        return
      }

      this._backendConnection.publishEvent(channel, payload)
    },

    // Listen for events from backend
    onEvent: (channel: string, callback: (payload: unknown) => void): void => {
      if (!this._backendConnection) {
        preloadLogger.warn('⚠️ Cannot listen for events - backend not connected')
        return
      }

      // Wrap the callback to handle AI event payload unwrapping
      const wrappedCallback = (payload: unknown): void => {
        // For AI events, unwrap the connection payload format
        if (channel.startsWith('ai-chat-')) {
          try {
            if (payload && typeof payload === 'object' && 'payload' in payload) {
              // Extract and parse the JSON string from the payload field
              const args = JSON.parse((payload as { payload: string }).payload)
              // Call the original callback with spread arguments (cast for AI events)
              ;(callback as (...args: unknown[]) => void)(...args)
              return
            }
          } catch (error) {
            preloadLogger.error(`Failed to unwrap AI event ${channel}:`, error)
          }
        }

        // For non-AI events or if unwrapping fails, pass payload as-is
        callback(payload)
      }

      this._backendConnection.onEvent(channel, wrappedCallback)
    },

    // Stop listening for events from backend
    offEvent: (channel: string): void => {
      if (!this._backendConnection) {
        return
      }

      this._backendConnection.offEvent(channel)
    },

    // Database operations (moved from mainAPI)
    getSetting: async (key: string): Promise<unknown> => {
      if (!this._backendConnection) {
        throw new Error('Backend not connected')
      }

      const result = await this._backendConnection.invoke('get-setting', key)
      if (isOk(result)) {
        return result.value
      } else {
        throw new Error(result.error?.toString() || 'Get setting failed')
      }
    },

    setSetting: async (key: string, value: unknown): Promise<void> => {
      if (!this._backendConnection) {
        throw new Error('Backend not connected')
      }

      const result = await this._backendConnection.invoke('set-setting', key, value)
      if (!isOk(result)) {
        throw new Error(result.error?.toString() || 'Set setting failed')
      }
    },

    getAllSettings: async (): Promise<Record<string, unknown>> => {
      if (!this._backendConnection) {
        throw new Error('Backend not connected')
      }

      const result = await this._backendConnection.invoke('get-all-settings')
      if (isOk(result)) {
        return result.value as Record<string, unknown>
      } else {
        throw new Error(result.error?.toString() || 'Get all settings failed')
      }
    },

    clearSetting: async (key: string): Promise<void> => {
      if (!this._backendConnection) {
        throw new Error('Backend not connected')
      }

      const result = await this._backendConnection.invoke('clear-setting', key)
      if (!isOk(result)) {
        throw new Error(result.error?.toString() || 'Clear setting failed')
      }
    },

    clearDatabase: async (): Promise<void> => {
      if (!this._backendConnection) {
        throw new Error('Backend not connected')
      }

      const result = await this._backendConnection.invoke('clear-database')
      if (!isOk(result)) {
        throw new Error(result.error?.toString() || 'Clear database failed')
      }
    },

    getDatabasePath: async (): Promise<string> => {
      if (!this._backendConnection) {
        throw new Error('Backend not connected')
      }

      const result = await this._backendConnection.invoke('get-database-path')
      if (isOk(result)) {
        return result.value as string
      } else {
        throw new Error(result.error?.toString() || 'Get database path failed')
      }
    },

    getLogPath: async (): Promise<string> => {
      if (!this._backendConnection) {
        throw new Error('Backend not connected')
      }

      const result = await this._backendConnection.invoke('get-log-path')
      if (isOk(result)) {
        return result.value as string
      } else {
        throw new Error(result.error?.toString() || 'Get log path failed')
      }
    },

    // AI operations (moved from mainAPI)
    streamAIChat: async (messages: AIMessage[]): Promise<string> => {
      if (!this._backendConnection) {
        throw new Error('Backend not connected')
      }

      const result = await this._backendConnection.invoke('stream-ai-chat', messages)
      if (isOk(result)) {
        return result.value as string
      } else {
        throw new Error(result.error?.toString() || 'Stream AI chat failed')
      }
    },

    abortAIChat: async (sessionId: string): Promise<void> => {
      if (!this._backendConnection) {
        throw new Error('Backend not connected')
      }

      const result = await this._backendConnection.invoke('abort-ai-chat', sessionId)
      if (!isOk(result)) {
        throw new Error(result.error?.toString() || 'Abort AI chat failed')
      }
    },

    getAIModels: async (provider: AIProvider): Promise<string[]> => {
      if (!this._backendConnection) {
        throw new Error('Backend not connected')
      }

      const result = await this._backendConnection.invoke('get-ai-models', provider)
      if (isOk(result)) {
        return result.value as string[]
      } else {
        throw new Error(result.error?.toString() || 'Get AI models failed')
      }
    },

    testAIProviderConnection: async (config: AIConfig): Promise<boolean> => {
      if (!this._backendConnection) {
        throw new Error('Backend not connected')
      }

      const result = await this._backendConnection.invoke('test-ai-provider-connection', config)
      if (isOk(result)) {
        return result.value as boolean
      } else {
        throw new Error(result.error?.toString() || 'Test AI provider connection failed')
      }
    },

    // Check if backend is connected
    isConnected: (): boolean => {
      return this._backendConnection?.isConnected() === true
    }
  }

  async connectBackend(): Promise<void> {
    if (this._backendConnectionPromise) {
      return this._backendConnectionPromise
    }

    this._backendConnectionPromise = new Promise<void>((resolve) => {
      // Listen for backend MessagePort from main process
      ipcRenderer.on('backend-connected', (event) => {
        const [port] = event.ports
        this._backendConnection = new Connection(port)

        preloadLogger.info('✅ Backend connection established')
        resolve()
      })

      // attempt to reconnect when backend exited
      ipcRenderer.on('backend-exited', () => {
        ipcRenderer.send('connect-backend')
      })

      preloadLogger.info('🔄 Connecting to backend')
      ipcRenderer.send('connect-backend')
    })

    return this._backendConnectionPromise
  }
}
