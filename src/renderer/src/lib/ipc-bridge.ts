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
      isActive: boolean
      isAborted: boolean
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
      const sessionState = {
        cleanup: () => {
          if (abortSignal) {
            abortSignal.removeEventListener('abort', abortListener)
          }
          this.activeStreams.delete(sessionId)
        },
        abortController,
        isActive: true,
        isAborted: false,
        error: null
      }

      this.activeStreams.set(sessionId, sessionState)

      const stream = this.createStreamGenerator(sessionId, abortController.signal)

      // Link external abort signal to internal abort controller
      const abortListener = async (): Promise<void> => {
        logger.info('🚫 External abort signal received, aborting stream')
        this.markSessionAborted(sessionId)
        abortController.abort()
        try {
          await window.api.abortAIChat(sessionId)
        } catch (error) {
          logger.error('Failed to abort chat session:', error)
        }
      }

      if (abortSignal) {
        abortSignal.addEventListener('abort', abortListener)
      }

      return {
        stream,
        isAborted: () => {
          const session = this.activeStreams.get(sessionId)
          return session?.isAborted === true
        }
      }
    } catch (error) {
      logger.error('Failed to start stream:', error)
      throw error
    }
  }

  private markSessionAborted(sessionId: string): void {
    const session = this.activeStreams.get(sessionId)
    if (session) {
      session.isAborted = true
      session.isActive = false
      logger.info('🚫 Session marked as aborted:', sessionId)
    }
  }

  private markSessionCompleted(sessionId: string): void {
    const session = this.activeStreams.get(sessionId)
    if (session) {
      session.isActive = false
      logger.info('✅ Session marked as completed:', sessionId)
    }
  }

  private markSessionError(sessionId: string, error: string): void {
    const session = this.activeStreams.get(sessionId)
    if (session) {
      session.isActive = false
      session.error = error
      logger.error('❌ Session marked as error:', sessionId, error)
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

    const handleChunk = (...args: unknown[]): void => {
      const [, id, chunk] = args
      if (id === sessionId) {
        pendingChunks.push(chunk as string)
        if (resolveWaiting) {
          const resolve = resolveWaiting
          resolveWaiting = null
          resolve()
        }
      }
    }

    const handleEnd = (...args: unknown[]): void => {
      const [, id] = args
      if (id === sessionId) {
        completed = true
        this.markSessionCompleted(sessionId)
        if (resolveWaiting) {
          const resolve = resolveWaiting
          resolveWaiting = null
          resolve()
        }
      }
    }

    const handleError = (...args: unknown[]): void => {
      const [, id, errorMessage] = args
      if (id === sessionId) {
        error = errorMessage as string
        this.markSessionError(sessionId, error)
        if (resolveWaiting) {
          const resolve = resolveWaiting
          resolveWaiting = null
          resolve()
        }
      }
    }

    const handleAborted = (...args: unknown[]): void => {
      const [, id] = args
      if (id === sessionId) {
        completed = true
        this.markSessionAborted(sessionId)
        if (resolveWaiting) {
          const resolve = resolveWaiting
          resolveWaiting = null
          resolve()
        }
      }
    }

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
          for (const chunk of pendingChunks) {
            yield chunk
          }
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
        for (const chunk of pendingChunks) {
          yield chunk
        }
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
      streamData.abortController.abort()
      abortPromises.push(
        window.api.abortAIChat(sessionId).catch((error) => {
          logger.error('Failed to abort chat session during cleanup:', error)
        })
      )
      streamData.cleanup()
    }
    await Promise.all(abortPromises)
    this.activeStreams.clear()
  }

  // Get active stream count (for debugging)
  getActiveStreamCount(): number {
    return this.activeStreams.size
  }
}

// Singleton instance
export const aiStreamBridge = new AIStreamBridge()
