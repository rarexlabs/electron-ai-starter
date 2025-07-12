import { logger } from '@renderer/lib/logger'
import type { AIMessage } from '@common/types'

export async function streamText(
  messages: AIMessage[],
  abortSignal: AbortSignal
): Promise<AsyncGenerator<string, void, unknown>> {
  try {
    const sessionId = await window.api.streamAIChat(messages)
    logger.info('🚀 Stream started with session:', sessionId)
    return receiveStream(sessionId, abortSignal)
  } catch (error) {
    logger.error('Failed to start stream:', error)
    throw error
  }
}

async function* receiveStream(
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
          logger.info('✅ Stream completed for session:', sessionId)
          break
        case 'error':
          error = data as string
          logger.error('❌ Stream error for session:', sessionId, error)
          break
        case 'aborted':
          completed = true
          logger.info('Stream aborted for session:', sessionId)
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

  // Handle external abort signal
  const handleAbortSignal = async (): Promise<void> => {
    logger.info('External abort signal received, aborting stream')
    try {
      await window.api.abortAIChat(sessionId)
    } catch (abortError) {
      logger.error('Failed to abort chat session:', abortError)
    }
  }

  try {
    // Set up event listeners using exposed IPC methods
    window.api.on('ai-chat-chunk', handleChunk)
    window.api.on('ai-chat-end', handleEnd)
    window.api.on('ai-chat-error', handleError)
    window.api.on('ai-chat-aborted', handleAborted)
    abortSignal.addEventListener('abort', handleAbortSignal)

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

    // Final yield of any remaining chunks
    if (pendingChunks.length > 0) {
      yield* pendingChunks
    }

    // Throw error if one occurred (for proper async generator error handling)
    if (error) {
      throw new Error(error)
    }
  } catch (streamError) {
    logger.error('Stream generator error for session:', sessionId, streamError)
    throw streamError
  } finally {
    // Clean up event listeners - safe to call even if not set up
    window.api.off('ai-chat-chunk', handleChunk)
    window.api.off('ai-chat-end', handleEnd)
    window.api.off('ai-chat-error', handleError)
    window.api.off('ai-chat-aborted', handleAborted)
    abortSignal.removeEventListener('abort', handleAbortSignal)

    logger.info('🧹 Cleaned up stream generator for session:', sessionId)
  }
}
