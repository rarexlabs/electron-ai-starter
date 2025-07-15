import { Connection } from '@common/connection'
import type { MessagePortMain } from 'electron'
import type { BackendMainAPI } from '@common/types'
import { Handler } from './handler'
import { backendLogger } from './logger'

/**
 * This class encapsulate the main logic of the backend thread.
 * It keeps 2 state:
 *
 *  1. A single connection to the main thread
 *  2. A list of connections to renderers
 */
export class Server {
  private _mainConnection: Connection
  private _rendererConnections: Connection[] = []

  constructor(parentPort: Electron.ParentPort) {
    this._mainConnection = new Connection(parentPort)
  }

  /**
   * Connect a renderer's port and setup listeners to handle all invoke request
   * coming from that renderer.
   */
  connectRenderer(port: MessagePortMain): Connection {
    const connection = new Connection(port)
    this._rendererConnections.push(connection)
    connection.handleAll(async (channel: string, args: unknown[]) => {
      const handler = new Handler({ rendererConnetion: connection })
      const channelHandler = handler[channel]
      const result = await channelHandler.apply(handler, args)
      return result
    })

    backendLogger.info('Renderer Connected')
    return connection
  }

  private _invokeMain(channel: string, ...args: unknown[]) {
    return this._mainConnection.invoke(channel, ...args)
  }

  get mainAPI(): BackendMainAPI {
    return {
      osEncrypt: (...args) => this._invokeMain('osEncrypt', ...args),
      osDecrypt: (...args) => this._invokeMain('osDecrypt', ...args)
    }
  }
}
