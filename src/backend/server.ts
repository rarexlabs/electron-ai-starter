import { Connection } from '@common/connection'
import type { MessagePortMain } from 'electron'
import type { Result, BackendMainAPI } from '@common/types'

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

    // Handle ping requests
    connection.handle('ping', async () => {
      return { status: 'success', data: 'pong' }
    })

    // Handle test requests
    connection.handle('test', async (...args) => {
      const message = args[0] as string
      return { status: 'success', data: `Echo: ${message}` }
    })

    // Handle error test requests
    connection.handle('error-test', async () => {
      return { status: 'error', error: new Error('Test error from backend') }
    })

    // Example of listening for events
    connection.onEvent('custom-event', (payload) => {
      // Echo the event back to preload
      connection!.publishEvent('echo-event', `Echo: ${payload}`)
    })

    return connection
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private _invokeMain(channel: string, ...args): Promise<Result<any, any>> {
    return this._mainConnection.invoke(channel, ...args)
  }

  get mainAPI(): BackendMainAPI {
    return {
      osEncrypt: (...args) => this._invokeMain('osEncrypt', ...args),
      osDecrypt: (...args) => this._invokeMain('osDecrypt', ...args)
    }
  }
}
