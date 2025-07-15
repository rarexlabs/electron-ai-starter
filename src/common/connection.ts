import { Result, TimeoutError, InvokeMessage, ResultMessage, EventMessage, AppEvent } from './types'
import { MessagePortMain } from 'electron'

// Helper function to generate unique IDs
function createId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36)
}

/**
 * This class encapsulates a bidirectional connection for Electron processes.
 * It provides invoke/handle pattern for request-response communication and
 * event publishing/subscription for one-way notifications.
 *
 * Works with both MessagePort (web API) and MessagePortMain (Node.js EventEmitter API).
 */
export class Connection {
  private _eventListeners: Record<string, ((...args) => void)[]> = {}
  private _channelLastReceivedEvent: Record<string, EventMessage> = {}
  private _isStarted = false

  constructor(private port: MessagePort | MessagePortMain | Electron.ParentPort) {
    // Start the port
    if ('start' in port) port.start()
    this._isStarted = true

    this._onAllEvent((e) => {
      this._channelLastReceivedEvent[e.channel] = e
    })
  }

  /**
   * Invoke a channel of this connection which can be awaited on. The invoke is used for
   * situations where the sending side needs a reply from the other side of the connection.
   * Invoke has a timeout of 30 minutes, if the other end of the connection does not handle the
   * invoke within the timeout, this function will return `{status: 'error', error: TimeoutError}`.
   * This method essentially sends a message to the other end of the connection and waits for
   * a reply before resolving the promise.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async invoke(channel: string, ...args: unknown[]): Promise<Result<any, any>> {
    const TIMEOUT_DURATION = 1800000 // 30 minutes in milliseconds

    return new Promise((resolve) => {
      if (!this._isStarted) {
        resolve({ status: 'error', error: new Error('Connection not started') })
        return
      }

      const msg = this._invokeMessage(channel, args)

      const resultListener = (event: MessageEvent): void => {
        const data = event.data
        if (data.channel !== channel) return
        if (data.id !== msg.id) return
        if (data.type !== 'result') return

        clearTimeout(timeoutId)
        this._removeListener(resultListener)
        resolve(data.payload)
      }

      const timeoutId = setTimeout(() => {
        this._removeListener(resultListener)
        resolve({ status: 'error', error: new TimeoutError({ limitMs: TIMEOUT_DURATION }) })
      }, TIMEOUT_DURATION)

      this._addListener(resultListener)
      this._postMessage(msg)
    })
  }

  /**
   * Handle an invoke call from the other side of the connection to a specific channel. The
   * given callback needs to resolve its promise within 30 minutes, otherwise the other side
   * will timeout. See {@link invoke}.
   */
  handle(channel: string, callback: (...args) => Promise<Result<unknown, unknown>>): void {
    const listener = async (event: MessageEvent): Promise<void> => {
      const data = event.data
      if (data.type !== 'invoke') return
      if (data.channel !== channel) return

      const invoke = data as InvokeMessage
      const result = await callback(...invoke.args)
      const msg = this._resultMessage(invoke, result)
      this._postMessage(msg)
    }

    this._addListener(listener)
  }

  /**
   * Handle an invoke call from the other side of the connection to all channels.
   */
  handleAll(
    callback: (channel: string, args: unknown[]) => Promise<Result<unknown, unknown>>
  ): void {
    const listener = async (event: MessageEvent): Promise<void> => {
      const data = event.data
      if (!data || data.type !== 'invoke') return

      const invoke = data as InvokeMessage
      try {
        const result = await callback(invoke.channel, invoke.args)
        const msg = this._resultMessage(invoke, result)
        this._postMessage(msg)
      } catch (error) {
        const errorResult: Result<unknown, unknown> = { status: 'error', error }
        const msg = this._resultMessage(invoke, errorResult)
        this._postMessage(msg)
      }
    }

    this._addListener(listener)
  }

  /**
   * Publish an event to the other side of the connection via a list of channels.
   * Unlike invoke, publishing event is for things that the other side of the connection
   * may be interested in, but the sending side does not need a reply.
   */
  publishEvent(channels: string[] | string, event?: AppEvent): void {
    if (!this._isStarted) {
      return
    }

    const channelArray = Array.isArray(channels) ? channels : [channels]
    for (const channel of channelArray) {
      const msg = this._eventMessage(channel, event)
      this._postMessage(msg)
    }
  }

  /**
   * Add a listener to handle events from the other side of the connection via a specific channel.
   * When a listener is added, it will be immediately invoked with the most recent event from that
   * channel if any, even if that event has already been handled by other listeners.
   */
  onEvent(channel: string, callback: (arg) => void): void {
    const listener = (event: MessageEvent): void => {
      const data = event.data
      if (data.type !== 'event') return
      if (data.channel !== channel) return

      const eventMessage = data as EventMessage
      callback(eventMessage.payload)
    }

    const lastEvent = this._channelLastReceivedEvent[channel]
    if (lastEvent) {
      callback(lastEvent.payload)
    }

    this._addListener(listener)
    this._eventListeners[channel] ||= []
    this._eventListeners[channel].push(listener)
  }

  /**
   * Remove all listeners of a specific channel that were previously added via {@link onEvent}.
   */
  offEvent(channel: string): void {
    if (!this._eventListeners[channel]) return

    for (const listener of this._eventListeners[channel]) {
      this._removeListener(listener)
    }
    delete this._eventListeners[channel]
  }

  /**
   * Check if the connection is ready for communication
   */
  isConnected(): boolean {
    return this._isStarted
  }

  /**
   * Close the connection and clean up listeners
   */
  close(): void {
    if ('close' in this.port) this.port.close()
    this._eventListeners = {}
    this._channelLastReceivedEvent = {}
    this._isStarted = false
  }

  private _onAllEvent(callback: (event: EventMessage) => void): void {
    const listener = (event: MessageEvent): void => {
      const data = event.data
      if (data.type !== 'event') return
      if (!data.channel) return

      const eventMessage = data as EventMessage
      callback(eventMessage)
    }

    this._addListener(listener)
  }

  private _postMessage(msg: InvokeMessage | ResultMessage | EventMessage): void {
    if (!this._isStarted) return
    this.port.postMessage(msg)
  }

  private _addListener(listener: (event: MessageEvent) => void): void {
    if ('addEventListener' in this.port) {
      // Web MessagePort API
      this.port.addEventListener('message', listener)
    } else {
      // Node.js EventEmitter API (MessagePortMain)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      this.port.on('message', listener as any)
    }
  }

  private _removeListener(listener: (event: MessageEvent) => void): void {
    if ('removeEventListener' in this.port) {
      // Web MessagePort API
      this.port.removeEventListener('message', listener)
    } else {
      // Node.js EventEmitter API (MessagePortMain)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      this.port.removeListener('message', listener as any)
    }
  }

  private _invokeMessage(channel: string, args: unknown[]): InvokeMessage {
    return {
      id: createId(),
      type: 'invoke',
      channel,
      args
    }
  }

  private _resultMessage(
    invokeMessage: InvokeMessage,
    result: Result<unknown, unknown>
  ): ResultMessage {
    return {
      id: invokeMessage.id,
      type: 'result',
      channel: invokeMessage.channel,
      payload: result
    }
  }

  private _eventMessage(channel: string, event: unknown): EventMessage {
    return {
      type: 'event',
      channel,
      payload: event
    }
  }
}
