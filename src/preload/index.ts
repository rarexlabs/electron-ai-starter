import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Custom APIs for renderer
const api = {}

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

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
    contextBridge.exposeInMainWorld('database', databaseAPI)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
  // @ts-ignore (define in dts)
  window.database = databaseAPI
}
