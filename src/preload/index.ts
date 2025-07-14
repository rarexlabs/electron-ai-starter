import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import 'electron-log/preload'
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

// Backend connection setup
let backendConnection: Connection | null = null

// Listen for backend MessagePort from main process
ipcRenderer.on('backend-port', (event) => {
  const [port] = event.ports
  if (port) {
    backendConnection = new Connection(port)
    preloadLogger.info('✅ Backend connection established')
  } else {
    preloadLogger.error('❌ No MessagePort received from main process')
  }
})

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

// API implementation using secure IPC
const API = {
  main: {
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
  },

  backend: {
    // Backend process communication using Connection directly
    ping: async (): Promise<string> => {
      if (!backendConnection) {
        throw new Error('Backend not connected')
      }

      const result = await backendConnection.invoke('ping')
      if (result.status === 'success') {
        return result.data as string
      } else {
        throw new Error(result.error?.toString() || 'Backend ping failed')
      }
    },

    // Test backend communication with a message
    test: async (message: string): Promise<string> => {
      if (!backendConnection) {
        throw new Error('Backend not connected')
      }

      const result = await backendConnection.invoke('test', message)
      if (result.status === 'success') {
        return result.data as string
      } else {
        throw new Error(result.error?.toString() || 'Backend test failed')
      }
    },

    // Test error handling
    testError: async (): Promise<void> => {
      if (!backendConnection) {
        throw new Error('Backend not connected')
      }

      const result = await backendConnection.invoke('error-test')
      if (result.status === 'error') {
        throw new Error(result.error?.toString() || 'Backend error test failed')
      }
    },

    // Generic invoke method for custom backend operations
    invoke: async (channel: string, ...args: unknown[]): Promise<unknown> => {
      if (!backendConnection) {
        throw new Error('Backend not connected')
      }

      const result = await backendConnection.invoke(channel, ...args)
      if (result.status === 'success') {
        return result.data
      } else {
        throw new Error(result.error?.toString() || `Backend invoke ${channel} failed`)
      }
    },

    // Publish events to backend
    publishEvent: (channel: string, payload: string): void => {
      if (!backendConnection) {
        preloadLogger.warn('⚠️ Cannot publish event - backend not connected')
        return
      }

      backendConnection.publishEvent(channel, payload)
    },

    // Listen for events from backend
    onEvent: (channel: string, callback: (payload: unknown) => void): void => {
      if (!backendConnection) {
        preloadLogger.warn('⚠️ Cannot listen for events - backend not connected')
        return
      }

      backendConnection.onEvent(channel, callback)
    },

    // Stop listening for events from backend
    offEvent: (channel: string): void => {
      if (!backendConnection) {
        return
      }

      backendConnection.offEvent(channel)
    },

    // Check if backend is connected
    isConnected: (): boolean => {
      return backendConnection?.isConnected() === true
    }
  }
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', API)
  } catch (error) {
    preloadLogger.error('Context bridge error:', error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = API
}
