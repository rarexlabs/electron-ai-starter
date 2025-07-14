import { contextBridge } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import { Server } from './server'

function expose(name: string, data: unknown): void {
  // Use `contextBridge` APIs to expose Electron APIs to
  // renderer only if context isolation is enabled, otherwise
  // just add to the DOM global.
  if (process.contextIsolated) {
    try {
      contextBridge.exposeInMainWorld(name, data)
    } catch (error) {
      console.error(error)
    }
  } else {
    // @ts-ignore (define in dts)
    window[name] = data
  }
}

function main(): void {
  expose('electron', electronAPI)
  const server = new Server()
  server.connectBackend()

  // Expose so that frontend can call to wait for backend
  // to connect, before calling any backend API to avoid
  // race condition.
  expose('connectBackend', () => {
    return server.connectBackend()
  })

  expose('main', server.mainAPI)
  expose('backend', server.backendAPI)
}

main()
