import type { AIMessage, AIConfig } from '@common/types'
import { streamAIToSession } from './stream'
import { sessionStore } from './stream-session-store'
import { createModel } from './factory'
import { streamText } from 'ai'
import { mainLogger } from '@main/logger'

export { listAvailableModel } from './factory'

export async function testConnection(config: AIConfig): Promise<boolean> {
  try {
    const aiModel = createModel(config.provider, config.apiKey, config.model)
    const result = streamText({
      model: aiModel,
      messages: [{ role: 'user', content: 'Test' }],
      maxTokens: 5
    })

    for await (const chunk of result.textStream) {
      if (chunk?.length > 0) {
        mainLogger.info(`Connection test successful for ${config.provider}`)
        return true
      }
    }
    return false
  } catch (error) {
    mainLogger.error(`Connection test failed for ${config.provider}:`, error)
    return false
  }
}

// Main orchestration function for AI chat processing
export async function streamAIChat(
  messages: AIMessage[],
  config: AIConfig,
  send: (channel: string, ...args: unknown[]) => void
): Promise<string> {
  // Create and store session
  const session = sessionStore.createSession()

  // Start streaming directly to session (handles everything in one function)
  streamAIToSession(session, messages, config, send, sessionStore)

  return session.id
}

// Utility function to abort a chat session
export function abortAIChat(sessionId: string): boolean {
  return sessionStore.abortSession(sessionId)
}
