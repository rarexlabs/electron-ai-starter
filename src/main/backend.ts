import { utilityProcess, MessageChannelMain, UtilityProcess, WebContents } from 'electron'
import { mainLogger } from './logger'
import { getBasePath } from './paths'
import backendPath from '../backend/index?modulePath'

export class Backend {
  private _process: UtilityProcess
  private _messageChannels: Map<number, MessageChannelMain> = new Map()

  constructor() {
    const userDataPath = getBasePath()
    this._process = utilityProcess.fork(backendPath, ['--user-data-path', userDataPath])
  }

  connect(renderer: WebContents): void {
    const messageChannel = new MessageChannelMain()
    this._messageChannels.set(renderer.id, messageChannel)
    const backendPort = messageChannel.port1
    const rendererPort = messageChannel.port2
    backendPort.start()
    rendererPort.start()

    // send one port to backend tell it it is a connection for renderer
    const message = `renderer/${renderer.id}`
    this._process.postMessage({ channel: 'connectRenderer', message }, [backendPort])

    this._afterRendererConnected(message, () => {
      // send the other port to renderer and inform backend is connected
      renderer.postMessage('backendConnected', null, [rendererPort])
    })
  }

  private _afterRendererConnected(rendererId: string, callback: () => void): void {
    const responseListener = (e) => {
      if (e.data.channel !== 'rendererConnected') return
      if (e.data.message !== rendererId) return

      // Remove listener immediately to prevent accumulation
      this._process.removeListener('message', responseListener)

      // Execute callback
      callback()
    }

    this._process.on('message', responseListener)
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
