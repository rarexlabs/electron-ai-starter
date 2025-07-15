import { logger } from '@renderer/lib/logger'
import type { AIMessage } from '@common/types'

export async function streamText(
  messages: AIMessage[],
  abortSignal: AbortSignal
): Promise<AsyncGenerator<string, void, unknown>> {
  try {
    // Ensure backend is connected before making the call
    await window.connectBackend()
    const sessionId = await window.backend.streamAIChat(messages)
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
  let resolveYieldLoopBlocker: (() => void) | null = null

  // Simplified waiting notification
  const unblockYieldLoop = (): void => {
    if (!resolveYieldLoopBlocker) return
    resolveYieldLoopBlocker()
    resolveYieldLoopBlocker = null
  }

  // Cleaner async waiting mechanism
  const waitForEvent = (): Promise<void> =>
    new Promise<void>((resolve) => {
      resolveYieldLoopBlocker = resolve
      // Immediate resolve if stream is already finished
      if (completed || error || abortSignal.aborted) {
        resolve()
      }
    })

  const handleChunk = (id: string, data: string): void => {
    if (id !== sessionId) return
    if (data) {
      pendingChunks.push(data)
    }
    unblockYieldLoop()
  }

  const handleEnd = (id: string): void => {
    if (id !== sessionId) return
    completed = true
    logger.info('✅ Stream completed for session:', sessionId)
    unblockYieldLoop()
  }

  const handleError = (id: string, data: string): void => {
    if (id !== sessionId) return
    error = data || 'Unknown error'
    logger.error('❌ Stream error for session:', sessionId, error)
    unblockYieldLoop()
  }

  const handleAborted = (id: string): void => {
    if (id !== sessionId) return
    completed = true
    logger.info('Stream aborted for session:', sessionId)
    unblockYieldLoop()
  }

  // Handle external abort signal
  const handleAbortSignal = async (): Promise<void> => {
    logger.info('External abort signal received, aborting stream')
    try {
      await window.backend.abortAIChat(sessionId)
    } catch (abortError) {
      logger.error('Failed to abort chat session:', abortError)
    }
  }

  try {
    // Set up event listeners directly from backend
    window.backend.onEvent('ai-chat-chunk', handleChunk as (...args: unknown[]) => void)
    window.backend.onEvent('ai-chat-end', handleEnd as (...args: unknown[]) => void)
    window.backend.onEvent('ai-chat-error', handleError as (...args: unknown[]) => void)
    window.backend.onEvent('ai-chat-aborted', handleAborted as (...args: unknown[]) => void)
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
        await waitForEvent()
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
    window.backend.offEvent('ai-chat-chunk')
    window.backend.offEvent('ai-chat-end')
    window.backend.offEvent('ai-chat-error')
    window.backend.offEvent('ai-chat-aborted')
    abortSignal.removeEventListener('abort', handleAbortSignal)

    logger.info('🧹 Cleaned up stream generator for session:', sessionId)
  }
}
