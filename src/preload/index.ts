import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Backend communication state
let backendPort: MessagePort | null = null
let communicationSetup = false

// Listen for backend MessagePort from main process
ipcRenderer.on('backend-port', (event) => {
  if (communicationSetup) {
    __electronLog.warn('⚠️ Backend communication already setup, skipping duplicate')
    return
  }

  const [port] = event.ports
  if (port) {
    backendPort = port
    backendPort.start()
    communicationSetup = true
    __electronLog.info('✅ Backend MessagePort received and started')
  } else {
    __electronLog.error('❌ No MessagePort received from main process')
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
  },

  // Backend process communication
  pingBackend: (): Promise<string> => {
    return new Promise((resolve, reject) => {
      if (!backendPort) {
        reject(new Error('Backend not connected'))
        return
      }

      const timeout = setTimeout(() => {
        reject(new Error('Backend ping timeout'))
      }, 5000)

      const handleResponse = (e: MessageEvent) => {
        if (e.data === 'pong') {
          clearTimeout(timeout)
          backendPort!.removeEventListener('message', handleResponse)
          resolve('pong')
          __electronLog.info('✅ Received pong from backend')
        }
      }

      backendPort.addEventListener('message', handleResponse)
      backendPort.postMessage('ping')
      __electronLog.info('📤 Sent ping to backend')
    })
  },

  // Check if backend is connected
  isBackendConnected: (): boolean => {
    return backendPort !== null && communicationSetup
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
    __electronLog.error('Context bridge error:', error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = API
}
