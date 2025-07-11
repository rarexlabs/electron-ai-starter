import { streamText } from 'ai'
import { mainLogger } from '@main/logger'
import { createModel } from './factory'
import type { AIMessage, AIConfig } from '@common/types'
import type { StreamSession, StreamSessionStore } from './stream-session-store'

export async function* streamAIResponse(
  messages: AIMessage[],
  config: AIConfig,
  abortSignal?: AbortSignal
): AsyncGenerator<string, void, unknown> {
  try {
    const model = createModel(config.provider, config.apiKey, config.model)

    // Add abort signal listener for logging
    if (abortSignal) {
      abortSignal.addEventListener('abort', () => {
        mainLogger.info(
          `🚫 ABORT SIGNAL RECEIVED - Cancelling AI provider request for ${config.provider}`
        )
        mainLogger.info('🚫 This should prevent further token consumption from the AI provider')
      })
    }

    const result = streamText({
      model,
      messages,
      temperature: 0.7,
      maxTokens: 1000,
      abortSignal
    })

    mainLogger.info(`AI response streaming started with ${config.provider}`)

    for await (const chunk of result.textStream) {
      // Check if aborted during streaming
      if (abortSignal?.aborted) {
        mainLogger.info(`🚫 Stream aborted during chunk processing - stopping iteration`)
        throw new Error('AbortError')
      }
      yield chunk
    }

    mainLogger.info(`✅ AI response streaming completed successfully with ${config.provider}`)
  } catch (error) {
    if (error instanceof Error && (error.message === 'AbortError' || error.name === 'AbortError')) {
      mainLogger.info(`🚫 AI stream was aborted for ${config.provider}`)
    } else {
      mainLogger.error('AI chat error:', error)
    }
    throw error
  }
}


export function handleStreamError(
  error: unknown,
  sessionId: string,
  send: (channel: string, ...args: unknown[]) => void
): void {
  const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'

  // Check if error is due to abort
  if (error instanceof Error && error.name === 'AbortError') {
    mainLogger.info(`🚫 AI chat stream was aborted for session: ${sessionId}`)
    send('ai-chat-aborted', sessionId)
  } else {
    mainLogger.error('AI chat stream error:', error)
    send('ai-chat-error', sessionId, errorMessage)
  }
}

export async function sendAIStreamChunk(
  session: StreamSession,
  streamGenerator: AsyncGenerator<string, void, unknown>,
  send: (channel: string, ...args: unknown[]) => void,
  store: StreamSessionStore
): Promise<void> {
  try {
    for await (const chunk of streamGenerator) {
      // Check if session was aborted
      if (session.abortSignal.aborted) {
        send('ai-chat-aborted', session.id)
        break
      }
      send('ai-chat-chunk', session.id, chunk)
    }
    // Signal end of stream if not aborted
    if (!session.abortSignal.aborted) {
      send('ai-chat-end', session.id)
    }
  } catch (error) {
    handleStreamError(error, session.id, send)
  } finally {
    // Clean up session
    store.cleanupSession(session.id)
  }
}
