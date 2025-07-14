import { utilityProcess, MessageChannelMain, UtilityProcess, WebContents } from 'electron'
import { mainLogger } from './logger'
import backendPath from '../backend/index?modulePath'

export class Backend {
  private _process: UtilityProcess
  private _messageChannels: Map<number, MessageChannelMain> = new Map()

  constructor() {
    this._process = utilityProcess.fork(backendPath)
  }

  connect(renderer: WebContents): void {
    const messageChannel = new MessageChannelMain()

    if (this._messageChannels.has(renderer.id)) {
      mainLogger.warn(`Renderer ${renderer.id} already connected with backend`)
      return
    }

    this._messageChannels.set(renderer.id, messageChannel)
    const backendPort = messageChannel.port1
    const rendererPort = messageChannel.port2
    backendPort.start()
    rendererPort.start()

    this._process.postMessage({ message: 'init' }, [backendPort])
    renderer.postMessage('backend-connected', null, [rendererPort])
  }

  async stop(): Promise<void> {
    if (this._process) {
      mainLogger.info('🛑 Stopping backend process...')

      return new Promise<void>((resolve) => {
        if (!this._process) {
          resolve()
          return
        }

        // Listen for process exit
        this._process.once('exit', () => {
          mainLogger.info('✅ Backend process stopped')
          resolve()
        })

        // Try graceful shutdown first
        this._process.kill()
      })
    }
  }
}
