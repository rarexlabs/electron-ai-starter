import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import log from 'electron-log/preload'

// AI Chat API types
export type AIProvider = 'openai' | 'anthropic' | 'google'

export interface AIMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

// Unified API implementation using secure IPC
const unifiedAPI = {
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
  streamAIChat: (messages: AIMessage[], provider?: AIProvider): Promise<string> => {
    return ipcRenderer.invoke('stream-ai-chat', messages, provider)
  },

  abortAIChat: (sessionId: string): Promise<void> => {
    return ipcRenderer.invoke('abort-ai-chat', sessionId)
  },

  getAIModels: (provider: AIProvider): Promise<string[]> => {
    return ipcRenderer.invoke('get-ai-models', provider)
  },

  testAIProviderConnection: (provider: AIProvider): Promise<boolean> => {
    return ipcRenderer.invoke('test-ai-provider-connection', provider)
  },

  // Raw IPC event methods for renderer to handle streaming events
  on: (channel: string, listener: (...args: unknown[]) => void): void => {
    ipcRenderer.on(channel, listener)
  },

  off: (channel: string, listener: (...args: unknown[]) => void): void => {
    ipcRenderer.removeListener(channel, listener)
  }
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', unifiedAPI)
  } catch (error) {
    log.error('Context bridge error:', error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = unifiedAPI
}
