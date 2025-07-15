import { ipcRenderer } from 'electron'
import { Connection } from '../common/connection'
import { BackendListenerAPI, RendererBackendAPI, RendererMainAPI, AppEvent } from '../common/types'
import logger from './logger'

export class Server {
  private _backendConnectionPromise?: Promise<void>
  private _backendConnection: Connection | null = null

  public readonly mainAPI: RendererMainAPI = {
    ping: (...args) => ipcRenderer.invoke('ping', ...args),
    openFolder: (...args) => ipcRenderer.invoke('openFolder', ...args)
  }

  public readonly backendAPI: RendererBackendAPI & BackendListenerAPI = {
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
      ipcRenderer.on('backendConnected', (event) => {
        const [port] = event.ports
        this._backendConnection = new Connection(port)

        logger.info('Backend connection established')
        resolve()
      })

      // attempt to reconnect when backend exited
      ipcRenderer.on('backendExited', () => {
        ipcRenderer.send('connectBackend')
      })

      logger.info('Connecting to backend...')
      ipcRenderer.send('connectBackend')
    })

    return this._backendConnectionPromise
  }
}
