import { ipcRenderer } from 'electron'
import { Connection } from '../common/connection'
import { BackendListenerAPI, RendererBackendAPI, AppEvent } from '../common/types'
import logger from './logger'

export class Server {
  private _backendConnectionPromise?: Promise<void>
  private _backendConnection: Connection | null = null

  // Main process communication using secure IPC
  public readonly mainAPI = {
    // Only keep non-database/AI operations in main
    openFolder: (folderPath: string): Promise<void> => {
      return ipcRenderer.invoke('openFolder', folderPath)
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
    getSetting: (...args) => this._invoke('getSetting', ...args),
    setSetting: (...args) => this._invoke('setSetting', ...args),
    clearSetting: (...args) => this._invoke('clearSetting', ...args),
    clearDatabase: (...args) => this._invoke('clearDatabase', ...args),
    getDatabasePath: (...args) => this._invoke('getDatabasePath', ...args),
    getLogPath: (...args) => this._invoke('getLogPath', ...args),
    streamAIText: (...args) => this._invoke('streamAIText', ...args),
    abortAIText: (...args) => this._invoke('abortAIText', ...args),
    getAIModels: (...args) => this._invoke('getAIModels', ...args),
    testAIProviderConnection: (...args) => this._invoke('testAIProviderConnection', ...args),
    onEvent: (channel: string, callback: (appEvent: AppEvent) => void) => {
      this._backendConnection!.onEvent(channel, callback)
    },
    offEvent: (channel: string) => {
      this._backendConnection!.offEvent(channel)
    }
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
      ipcRenderer.on('backendConnected', (event) => {
        const [port] = event.ports
        this._backendConnection = new Connection(port)

        logger.info('✅ Backend connection established')
        resolve()
      })

      // attempt to reconnect when backend exited
      ipcRenderer.on('backendExited', () => {
        ipcRenderer.send('connectBackend')
      })

      logger.info('🔄 Connecting to backend')
      ipcRenderer.send('connectBackend')
    })

    return this._backendConnectionPromise
  }
}
