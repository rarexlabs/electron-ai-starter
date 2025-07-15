import type { AIMessage, AIConfig, AppEvent } from '@common/types'
import { streamSessionText } from './stream'
import { sessionStore } from './stream-session-store'
import { createModel } from './factory'
import { streamText as _streamText } from 'ai'
import { backendLogger } from '../logger'

export { listAvailableModel } from './factory'

export async function testConnection(config: AIConfig): Promise<boolean> {
  try {
    const aiModel = createModel(config.provider, config.apiKey, config.model)
    const result = _streamText({
      model: aiModel,
      messages: [{ role: 'user', content: 'Test' }],
      maxTokens: 5
    })

    for await (const chunk of result.textStream) {
      if (chunk?.length > 0) {
        backendLogger.info(`Connection test successful for ${config.provider}`)
        return true
      }
    }
    return false
  } catch (error) {
    backendLogger.error(`Connection test failed for ${config.provider}:`, error)
    return false
  }
}

// Main orchestration function for AI chat processing
export async function streamText(
  config: AIConfig,
  messages: AIMessage[],
  publishEvent: (channel: string, event: AppEvent) => void
): Promise<string> {
  // Create and store session
  const session = sessionStore.startSession()

  // Start streaming directly to session (handles everything in one function)
  streamSessionText(config, messages, session, publishEvent, () => {
    sessionStore.endSession(session.id)
  })

  return session.id
}

// Utility function to abort a chat session
export function abortStream(sessionId: string): boolean {
  return sessionStore.abortSession(sessionId)
}
