import type { AIMessage, AIConfig } from '@common/types'
import {
  createStreamSession,
  cleanupStreamSession,
  sendAIStreamChunk,
  streamAIResponse,
  activeStreamSessions
} from './stream'
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
  const session = createStreamSession(messages, config.provider)

  // Start streaming in the background
  const streamGenerator = streamAIResponse(messages, config, session.abortController.signal)

  // Process stream chunks asynchronously
  sendAIStreamChunk(session, streamGenerator, send)

  return session.id
}

// Utility function to abort a chat session
export function abortAIChat(sessionId: string): boolean {
  const session = activeStreamSessions.get(sessionId)
  if (session) {
    session.abortController.abort()
    cleanupStreamSession(sessionId)
    return true
  }
  return false
}
