import { ipcRenderer } from 'electron'
import { Connection } from '../common/connection'

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
    // Settings operations
    getSetting: (key: string): Promise<unknown> => {
      return ipcRenderer.invoke('get-setting', key)
    },

    setSetting: (key: string, value: unknown): Promise<void> => {
      return ipcRenderer.invoke('set-setting', key, value)
    },

    getAllSettings: (): Promise<Record<string, unknown>> => {
      return ipcRenderer.invoke('get-all-settings')
    },

    clearSetting: (key: string): Promise<void> => {
      return ipcRenderer.invoke('clear-setting', key)
    },

    clearDatabase: (): Promise<void> => {
      return ipcRenderer.invoke('clear-database')
    },

    getDatabasePath: (): Promise<string> => {
      return ipcRenderer.invoke('get-database-path')
    },

    getLogPath: (): Promise<string> => {
      return ipcRenderer.invoke('get-log-path')
    },

    openFolder: (folderPath: string): Promise<void> => {
      return ipcRenderer.invoke('open-folder', folderPath)
    },

    // AI operations
    streamAIChat: (messages: AIMessage[]): Promise<string> => {
      return ipcRenderer.invoke('stream-ai-chat', messages)
    },

    abortAIChat: (sessionId: string): Promise<void> => {
      return ipcRenderer.invoke('abort-ai-chat', sessionId)
    },

    getAIModels: (provider: AIProvider): Promise<string[]> => {
      return ipcRenderer.invoke('get-ai-models', provider)
    },

    testAIProviderConnection: (config: AIConfig): Promise<boolean> => {
      return ipcRenderer.invoke('test-ai-provider-connection', config)
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
      if (result.status === 'success') {
        return result.data as string
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
      if (result.status === 'success') {
        return result.data as string
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
      if (result.status === 'error') {
        throw new Error(result.error?.toString() || 'Backend error test failed')
      }
    },

    // Generic invoke method for custom backend operations
    invoke: async (channel: string, ...args: unknown[]): Promise<unknown> => {
      if (!this._backendConnection) {
        throw new Error('Backend not connected')
      }

      const result = await this._backendConnection.invoke(channel, ...args)
      if (result.status === 'success') {
        return result.data
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

      this._backendConnection.onEvent(channel, callback)
    },

    // Stop listening for events from backend
    offEvent: (channel: string): void => {
      if (!this._backendConnection) {
        return
      }

      this._backendConnection.offEvent(channel)
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
