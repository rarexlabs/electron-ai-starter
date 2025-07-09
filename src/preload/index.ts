import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import log from 'electron-log/preload'

// Custom APIs for renderer
const api = {}

// AI Chat API types
export type AIProvider = 'openai' | 'anthropic' | 'google'

export interface AIMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

// Database API implementation using secure IPC
const databaseAPI = {
  getSetting: (namespace: string, key: string): Promise<string | null> => {
    return ipcRenderer.invoke('get-setting', namespace, key)
  },

  setSetting: (namespace: string, key: string, value: string): Promise<void> => {
    return ipcRenderer.invoke('set-setting', namespace, key, value)
  },

  getSettingsByNamespace: (namespace: string): Promise<Record<string, string>> => {
    return ipcRenderer.invoke('get-settings-by-namespace', namespace)
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
  }
}

// AI Chat API implementation using secure IPC
const aiAPI = {
  streamChat: (
    messages: AIMessage[],
    provider?: AIProvider,
    onChunk?: (chunk: string) => void,
    onEnd?: () => void,
    onError?: (error: string) => void
  ): Promise<string> => {
    return new Promise((resolve, reject) => {
      ipcRenderer
        .invoke('ai-chat-stream', messages, provider)
        .then((sessionId) => {
          let fullResponse = ''

          const cleanup = (): void => {
            ipcRenderer.removeListener('ai-chat-chunk', handleChunk)
            ipcRenderer.removeListener('ai-chat-end', handleEnd)
            ipcRenderer.removeListener('ai-chat-error', handleError)
          }

          const createHandler =
            (callback: (id: string, ...args: unknown[]) => void) =>
            (_event: unknown, id: string, ...args: unknown[]) => {
              if (id === sessionId) callback(id, ...args)
            }

          const handleChunk = createHandler((_, chunk) => {
            fullResponse += chunk as string
            onChunk?.(chunk as string)
          })

          const handleEnd = createHandler(() => {
            cleanup()
            onEnd?.()
            resolve(fullResponse)
          })

          const handleError = createHandler((_, error) => {
            cleanup()
            onError?.(error as string)
            reject(new Error(error as string))
          })

          ipcRenderer.on('ai-chat-chunk', handleChunk)
          ipcRenderer.on('ai-chat-end', handleEnd)
          ipcRenderer.on('ai-chat-error', handleError)
        })
        .catch((error) => {
          reject(error)
        })
    })
  },

  getModels: (provider: AIProvider): Promise<string[]> => {
    return ipcRenderer.invoke('ai-get-models', provider)
  },

  testConnection: (provider: AIProvider): Promise<boolean> => {
    return ipcRenderer.invoke('ai-test-connection', provider)
  }
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
    contextBridge.exposeInMainWorld('database', databaseAPI)
    contextBridge.exposeInMainWorld('ai', aiAPI)
  } catch (error) {
    log.error('Context bridge error:', error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
  // @ts-ignore (define in dts)
  window.database = databaseAPI
  // @ts-ignore (define in dts)
  window.ai = aiAPI
}
