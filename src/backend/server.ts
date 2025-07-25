import { Connection } from '@common/connection'
import type { MessagePortMain } from 'electron'
import type { BackendMainAPI } from '@common/types'
import { Handler } from './handler'
import logger from './logger'
import { db, runMigrations, ensureConnection } from './db'

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

  async init(): Promise<void> {
    await ensureConnection(db)
    await runMigrations(db)
  }

  /**
   * Connect a renderer's port and setup listeners to handle all invoke request
   * coming from that renderer.
   */
  connectRenderer(port: MessagePortMain): Connection {
    const connection = new Connection(port)
    this._rendererConnections.push(connection)

    const handler = new Handler({ rendererConnetion: connection })
    connection.handleAll(async (channel: string, args: unknown[]) => {
      const channelHandler = handler[channel]
      const result = await channelHandler.apply(handler, args)
      return result
    })

    logger.info('Renderer Connected')
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
