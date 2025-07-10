import { streamText } from 'ai'
import { getSetting } from '../settings'
import { mainLogger } from '../logger'
import { createModel } from './config'
import type { AIProvider, AIMessage, AIStreamSession, AISettings } from '../../types/ai'

// Track active streaming sessions
export const activeStreamSessions = new Map<string, AIStreamSession>()

export async function* streamAIResponse(
  messages: AIMessage[],
  provider?: AIProvider,
  abortSignal?: AbortSignal
): AsyncGenerator<string, void, unknown> {
  const aiSettings = ((await getSetting('ai')) as AISettings) || {}
  const currentProvider = provider || aiSettings.default_provider || 'openai'

  try {
    const model = await createModel(currentProvider)

    // Add abort signal listener for logging
    if (abortSignal) {
      abortSignal.addEventListener('abort', () => {
        mainLogger.info(
          `🚫 ABORT SIGNAL RECEIVED - Cancelling AI provider request for ${currentProvider}`
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

    mainLogger.info(`AI response streaming started with ${currentProvider}`)

    for await (const chunk of result.textStream) {
      // Check if aborted during streaming
      if (abortSignal?.aborted) {
        mainLogger.info(`🚫 Stream aborted during chunk processing - stopping iteration`)
        throw new Error('AbortError')
      }
      yield chunk
    }

    mainLogger.info(`✅ AI response streaming completed successfully with ${currentProvider}`)
  } catch (error) {
    if (error instanceof Error && (error.message === 'AbortError' || error.name === 'AbortError')) {
      mainLogger.info(`🚫 AI stream was aborted for ${currentProvider}`)
    } else {
      mainLogger.error('AI chat error:', error)
    }
    throw error
  }
}

export function createStreamSession(messages: AIMessage[], provider?: AIProvider): AIStreamSession {
  const sessionId = Date.now().toString()
  const abortController = new AbortController()

  const session: AIStreamSession = {
    id: sessionId,
    provider: provider || 'openai',
    messages,
    abortController,
    createdAt: new Date()
  }

  activeStreamSessions.set(sessionId, session)
  return session
}

export function cleanupStreamSession(sessionId: string): void {
  activeStreamSessions.delete(sessionId)
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

export async function processAIStream(
  session: AIStreamSession,
  send: (channel: string, ...args: unknown[]) => void,
  streamGenerator: AsyncGenerator<string, void, unknown>
): Promise<void> {
  try {
    for await (const chunk of streamGenerator) {
      // Check if session was aborted
      if (session.abortController.signal.aborted) {
        send('ai-chat-aborted', session.id)
        break
      }
      send('ai-chat-chunk', session.id, chunk)
    }
    // Signal end of stream if not aborted
    if (!session.abortController.signal.aborted) {
      send('ai-chat-end', session.id)
    }
  } catch (error) {
    handleStreamError(error, session.id, send)
  } finally {
    // Clean up session
    cleanupStreamSession(session.id)
  }
}
