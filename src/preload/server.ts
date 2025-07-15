import { ipcRenderer } from 'electron'
import { Connection } from '../common/connection'
import { BackendListenerAPI, RendererBackendAPI } from '../common/types'

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
  public readonly backendAPI: RendererBackendAPI & BackendListenerAPI = {
    // Backend process communication using Connection directly
    ping: (...args) => this._invoke('ping', ...args),
    onEvent: (...args) => this._invoke('onEvent', ...args),
    offEvent: (...args) => this._invoke('offEvent', ...args),
    getSetting: (...args) => this._invoke('getSetting', ...args),
    setSetting: (...args) => this._invoke('setSetting', ...args),
    clearSetting: (...args) => this._invoke('clearSetting', ...args),
    clearDatabase: (...args) => this._invoke('clearDatabase', ...args),
    getDatabasePath: (...args) => this._invoke('getDatabasePath', ...args),
    getLogPath: (...args) => this._invoke('getLogpath', ...args),
    streamAIChat: (...args) => this._invoke('streamAIChat', ...args),
    abortAIChat: (...args) => this._invoke('abortAIChat', ...args),
    getAIModels: (...args) => this._invoke('getAIModels', ...args),
    testAIProviderConnection: (...args) => this._invoke('testAIProviderConnection', ...args)
  }

  private _invoke(channel: string, ...args) {
    return this._backendConnection!.invoke(channel, ...args)
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
