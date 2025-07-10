import { logger } from '@/lib/logger'
import type { AIProvider, AIMessage } from '../../../types/ai'

export interface StreamingResult {
  sessionId: string
  stream: AsyncGenerator<string, void, unknown>
  abort: () => Promise<void>
}

export class AIStreamBridge {
  private activeStreams = new Map<
    string,
    {
      cleanup: () => void
      abortController: AbortController
    }
  >()

  async startStream(
    messages: AIMessage[],
    provider?: AIProvider,
    abortSignal?: AbortSignal
  ): Promise<StreamingResult> {
    try {
      const abortController = new AbortController()

      // Get session ID from simplified API
      const sessionId = await window.api.streamAIChat(messages, provider)
      logger.info('🚀 Stream started with session:', sessionId)

      const stream = this.createStreamGenerator(sessionId, abortController.signal)

      // Link external abort signal to internal abort controller
      if (abortSignal) {
        const abortListener = (): void => {
          logger.info('🚫 External abort signal received, aborting stream')
          abortController.abort()
        }
        abortSignal.addEventListener('abort', abortListener)

        // Store cleanup function
        this.activeStreams.set(sessionId, {
          cleanup: () => {
            abortSignal.removeEventListener('abort', abortListener)
            this.activeStreams.delete(sessionId)
          },
          abortController
        })
      } else {
        // Store cleanup function even without external abort signal
        this.activeStreams.set(sessionId, {
          cleanup: () => {
            this.activeStreams.delete(sessionId)
          },
          abortController
        })
      }

      return {
        sessionId,
        stream,
        abort: async () => {
          logger.info('🚫 Aborting stream:', sessionId)
          abortController.abort()
          try {
            await window.api.abortAIChat(sessionId)
          } catch (error) {
            logger.error('Failed to abort chat session:', error)
          }
        }
      }
    } catch (error) {
      logger.error('Failed to start stream:', error)
      throw error
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
  cleanup(): void {
    logger.info('🧹 Cleaning up all active streams')
    for (const [, streamData] of this.activeStreams) {
      streamData.abortController.abort()
      streamData.cleanup()
    }
    this.activeStreams.clear()
  }

  // Get active stream count (for debugging)
  getActiveStreamCount(): number {
    return this.activeStreams.size
  }
}

// Singleton instance
export const aiStreamBridge = new AIStreamBridge()
