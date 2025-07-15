import { streamText } from 'ai'
import logger from '../logger'
import { createModel } from './factory'
import type { AIMessage, AIConfig, AppEvent } from '@common/types'
import { EventType } from '@common/types'
import type { StreamSession } from './stream-session-store'

function isAbortError(error: unknown): boolean {
  return error instanceof Error && (error.message === 'AbortError' || error.name === 'AbortError')
}

export async function streamSessionText(
  config: AIConfig,
  messages: AIMessage[],
  session: StreamSession,
  publishEvent: (channel: string, event: AppEvent) => void,
  cb: () => void
): Promise<void> {
  try {
    const model = createModel(config.provider, config.apiKey, config.model)

    // Add abort signal listener for logging
    session.abortSignal.addEventListener('abort', () => {
      logger.info(
        `ABORT SIGNAL RECEIVED - Cancelling AI provider request for ${config.provider} (session: ${session.id})`
      )
    })

    const result = streamText({
      model,
      messages,
      temperature: 0.7,
      maxTokens: 1000,
      abortSignal: session.abortSignal
    })

    logger.info(`AI response streaming started with ${config.provider} for session: ${session.id}`)

    for await (const chunk of result.textStream) {
      // Check if session was aborted
      if (session.abortSignal.aborted) {
        logger.info(`Stream aborted during chunk processing for session: ${session.id}`)
        publishEvent('aiChatAborted', {
          type: EventType.Message,
          payload: { sessionId: session.id }
        })
        return
      }
      publishEvent('aiChatChunk', {
        type: EventType.Message,
        payload: { sessionId: session.id, chunk }
      })
    }

    // Signal end of stream if not aborted
    if (!session.abortSignal.aborted) {
      publishEvent('aiChatEnd', { type: EventType.Message, payload: { sessionId: session.id } })
      logger.info(
        `✅ AI response streaming completed successfully with ${config.provider} for session: ${session.id}`
      )
    }
  } catch (error) {
    if (isAbortError(error)) {
      logger.info(`AI chat stream was aborted for session: ${session.id}`)
      publishEvent('aiChatAborted', {
        type: EventType.Message,
        payload: { sessionId: session.id }
      })
    } else {
      logger.error('AI chat stream error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      publishEvent('aiChatError', {
        type: EventType.Message,
        payload: { sessionId: session.id, error: errorMessage }
      })
    }
  } finally {
    // Execute caller-provided cleanup
    cb()
  }
}
