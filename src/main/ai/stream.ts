import { streamText } from 'ai'
import { mainLogger } from '@main/logger'
import { createModel } from './factory'
import type { AIMessage, AIConfig } from '@common/types'
import type { StreamSession, StreamSessionStore } from './stream-session-store'

function isAbortError(error: unknown): boolean {
  return error instanceof Error && (error.message === 'AbortError' || error.name === 'AbortError')
}

export async function streamAIToSession(
  session: StreamSession,
  messages: AIMessage[],
  config: AIConfig,
  send: (channel: string, ...args: unknown[]) => void,
  store: StreamSessionStore
): Promise<void> {
  try {
    const model = createModel(config.provider, config.apiKey, config.model)

    // Add abort signal listener for logging
    session.abortSignal.addEventListener('abort', () => {
      mainLogger.info(
        `🚫 ABORT SIGNAL RECEIVED - Cancelling AI provider request for ${config.provider} (session: ${session.id})`
      )
      mainLogger.info('🚫 This should prevent further token consumption from the AI provider')
    })

    const result = streamText({
      model,
      messages,
      temperature: 0.7,
      maxTokens: 1000,
      abortSignal: session.abortSignal
    })

    mainLogger.info(
      `AI response streaming started with ${config.provider} for session: ${session.id}`
    )

    for await (const chunk of result.textStream) {
      // Check if session was aborted
      if (session.abortSignal.aborted) {
        mainLogger.info(`🚫 Stream aborted during chunk processing for session: ${session.id}`)
        send('ai-chat-aborted', session.id)
        return
      }
      send('ai-chat-chunk', session.id, chunk)
    }

    // Signal end of stream if not aborted
    if (!session.abortSignal.aborted) {
      send('ai-chat-end', session.id)
      mainLogger.info(
        `✅ AI response streaming completed successfully with ${config.provider} for session: ${session.id}`
      )
    }
  } catch (error) {
    if (isAbortError(error)) {
      mainLogger.info(`🚫 AI chat stream was aborted for session: ${session.id}`)
      send('ai-chat-aborted', session.id)
    } else {
      mainLogger.error('AI chat stream error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      send('ai-chat-error', session.id, errorMessage)
    }
  } finally {
    // Clean up session
    store.cleanupSession(session.id)
  }
}
