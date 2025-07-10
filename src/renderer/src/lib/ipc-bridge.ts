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

      // Create a promise that resolves when we get the session ID
      const sessionPromise = new Promise<string>((resolve, reject) => {
        window.api
          .streamAIChat(
            messages,
            provider,
            () => {}, // onChunk - handled in stream generator
            () => {}, // onEnd - handled in stream generator
            (error) => {
              // Handle immediate errors
              reject(new Error(error))
            },
            (id) => {
              // Session ID callback
              resolve(id)
            }
          )
          .catch(reject)
      })

      // Wait for session ID
      const sessionId = await sessionPromise
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

    const handleChunk = (_event: unknown, id: string, chunk: string): void => {
      if (id === sessionId) {
        pendingChunks.push(chunk)
        if (resolveWaiting) {
          const resolve = resolveWaiting
          resolveWaiting = null
          resolve()
        }
      }
    }

    const handleEnd = (_event: unknown, id: string): void => {
      if (id === sessionId) {
        completed = true
        if (resolveWaiting) {
          const resolve = resolveWaiting
          resolveWaiting = null
          resolve()
        }
      }
    }

    const handleError = (_event: unknown, id: string, errorMessage: string): void => {
      if (id === sessionId) {
        error = errorMessage
        if (resolveWaiting) {
          const resolve = resolveWaiting
          resolveWaiting = null
          resolve()
        }
      }
    }

    const handleAborted = (_event: unknown, id: string): void => {
      if (id === sessionId) {
        completed = true
        if (resolveWaiting) {
          const resolve = resolveWaiting
          resolveWaiting = null
          resolve()
        }
      }
    }

    // Set up event listeners
    window.electron.ipcRenderer.on('ai-chat-chunk', handleChunk)
    window.electron.ipcRenderer.on('ai-chat-end', handleEnd)
    window.electron.ipcRenderer.on('ai-chat-error', handleError)
    window.electron.ipcRenderer.on('ai-chat-aborted', handleAborted)

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
      // Clean up event listeners
      window.electron.ipcRenderer.removeListener('ai-chat-chunk', handleChunk)
      window.electron.ipcRenderer.removeListener('ai-chat-end', handleEnd)
      window.electron.ipcRenderer.removeListener('ai-chat-error', handleError)
      window.electron.ipcRenderer.removeListener('ai-chat-aborted', handleAborted)

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
