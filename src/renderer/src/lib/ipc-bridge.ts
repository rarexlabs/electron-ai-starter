import { logger } from '@/lib/logger'
import type { AIMessage } from '../../../types/ai'

export interface StreamingResult {
  stream: AsyncGenerator<string, void, unknown>
  isAborted: () => boolean
}

export class AIStreamBridge {
  private activeStreams = new Map<
    string,
    {
      cleanup: () => void
      abortController: AbortController
      status: 'active' | 'completed' | 'aborted' | 'error'
      error: string | null
    }
  >()

  async startStream(messages: AIMessage[], abortSignal?: AbortSignal): Promise<StreamingResult> {
    try {
      const abortController = new AbortController()

      // Get session ID from simplified API
      const sessionId = await window.api.streamAIChat(messages)
      logger.info('🚀 Stream started with session:', sessionId)

      // Initialize session state
      const sessionState = this.createSessionState(sessionId, abortController, abortSignal)
      this.activeStreams.set(sessionId, sessionState)

      const stream = this.createStreamGenerator(sessionId, abortController.signal)

      return {
        stream,
        isAborted: () => this.getSession(sessionId)?.status === 'aborted'
      }
    } catch (error) {
      logger.error('Failed to start stream:', error)
      throw error
    }
  }

  private createSessionState(
    sessionId: string,
    abortController: AbortController,
    abortSignal?: AbortSignal
  ): {
    cleanup: () => void
    abortController: AbortController
    status: 'active'
    error: null
  } {
    const abortListener = async (): Promise<void> => {
      logger.info('🚫 External abort signal received, aborting stream')
      this.updateSessionState(sessionId, 'aborted')
      this.abortSession(sessionId, sessionState)
    }

    const sessionState = {
      cleanup: () => {
        if (abortSignal) {
          abortSignal.removeEventListener('abort', abortListener)
        }
        this.activeStreams.delete(sessionId)
      },
      abortController,
      status: 'active' as const,
      error: null
    }

    if (abortSignal) {
      abortSignal.addEventListener('abort', abortListener)
    }

    return sessionState
  }

  private getSession(sessionId: string):
    | {
        cleanup: () => void
        abortController: AbortController
        status: 'active' | 'completed' | 'aborted' | 'error'
        error: string | null
      }
    | undefined {
    return this.activeStreams.get(sessionId)
  }

  private updateSessionState(
    sessionId: string,
    status: 'completed' | 'aborted' | 'error',
    error?: string
  ): void {
    const session = this.activeStreams.get(sessionId)
    if (session) {
      session.status = status
      if (error) {
        session.error = error
      }

      const statusEmoji = { completed: '✅', aborted: '🚫', error: '❌' }[status]
      const logMessage = `${statusEmoji} Session marked as ${status}:`

      if (status === 'error') {
        logger.error(logMessage, sessionId, error)
      } else {
        logger.info(logMessage, sessionId)
      }
    }
  }

  private async *createStreamGenerator(
    sessionId: string,
    abortSignal: AbortSignal
  ): AsyncGenerator<string, void, unknown> {
    let completed = false
    let error: string | null = null
    let pendingChunks: string[] = []

    // Promise-based chunk waiting
    let resolveWaiting: (() => void) | null = null

    const createEventHandler = (eventType: 'chunk' | 'end' | 'error' | 'aborted') => {
      return (...args: unknown[]): void => {
        const [, id, data] = args
        if (id !== sessionId) return

        switch (eventType) {
          case 'chunk':
            pendingChunks.push(data as string)
            break
          case 'end':
            completed = true
            this.updateSessionState(sessionId, 'completed')
            break
          case 'error':
            error = data as string
            this.updateSessionState(sessionId, 'error', error)
            break
          case 'aborted':
            completed = true
            this.updateSessionState(sessionId, 'aborted')
            break
        }

        if (resolveWaiting) {
          const resolve = resolveWaiting
          resolveWaiting = null
          resolve()
        }
      }
    }

    const handleChunk = createEventHandler('chunk')
    const handleEnd = createEventHandler('end')
    const handleError = createEventHandler('error')
    const handleAborted = createEventHandler('aborted')

    // Set up event listeners using exposed IPC methods
    window.api.on('ai-chat-chunk', handleChunk)
    window.api.on('ai-chat-end', handleEnd)
    window.api.on('ai-chat-error', handleError)
    window.api.on('ai-chat-aborted', handleAborted)

    try {
      // Stream processing loop
      while (!completed && !error && !abortSignal.aborted) {
        // Yield any pending chunks
        if (pendingChunks.length > 0) {
          yield* pendingChunks
          pendingChunks = []
        }

        // Wait for next chunk, completion, or abort
        if (!completed && !error && !abortSignal.aborted) {
          await new Promise<void>((resolve) => {
            resolveWaiting = resolve
            // Also resolve immediately if already done
            if (completed || error || abortSignal.aborted) {
              resolve()
            }
          })
        }
      }

      // Handle final state
      if (abortSignal.aborted) {
        logger.info('🚫 Stream aborted for session:', sessionId)
        return
      }

      if (error) {
        logger.error('Stream error for session:', sessionId, error)
        throw new Error(error)
      }

      // Final yield of any remaining chunks
      if (pendingChunks.length > 0) {
        yield* pendingChunks
      }

      logger.info('✅ Stream completed for session:', sessionId)
    } catch (streamError) {
      logger.error('Stream generator error for session:', sessionId, streamError)
      throw streamError
    } finally {
      // Clean up event listeners using exposed IPC methods
      window.api.off('ai-chat-chunk', handleChunk)
      window.api.off('ai-chat-end', handleEnd)
      window.api.off('ai-chat-error', handleError)
      window.api.off('ai-chat-aborted', handleAborted)

      // Clean up from active streams
      const streamData = this.activeStreams.get(sessionId)
      if (streamData) {
        streamData.cleanup()
      }

      logger.info('🧹 Cleaned up stream generator for session:', sessionId)
    }
  }

  // Utility method to clean up all active streams (for app shutdown)
  async cleanup(): Promise<void> {
    logger.info('🧹 Cleaning up all active streams')
    const abortPromises: Promise<void>[] = []
    for (const [sessionId, streamData] of this.activeStreams) {
      this.abortSession(sessionId, streamData, abortPromises)
    }
    await Promise.all(abortPromises)
    this.activeStreams.clear()
  }

  private abortSession(
    sessionId: string,
    streamData: {
      cleanup: () => void
      abortController: AbortController
    },
    abortPromises: Promise<void>[] = []
  ): void {
    streamData.abortController.abort()
    abortPromises.push(
      window.api.abortAIChat(sessionId).catch((error) => {
        logger.error('Failed to abort chat session during cleanup:', error)
      })
    )
    streamData.cleanup()
  }

  // Get active stream count (for debugging)
  getActiveStreamCount(): number {
    return this.activeStreams.size
  }
}

// Singleton instance
export const aiStreamBridge = new AIStreamBridge()
