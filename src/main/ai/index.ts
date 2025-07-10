import type { AIProvider, AIMessage } from '../../types/ai'
import {
  createStreamSession,
  cleanupStreamSession,
  processAIStream,
  streamAIResponse,
  activeStreamSessions
} from './stream'
import { createModel } from './factory'
import { streamText } from 'ai'
import { mainLogger } from '../logger'

export { listAvailableModel } from './factory'

export async function testConnection(provider: AIProvider): Promise<boolean> {
  try {
    const model = await createModel(provider)
    const result = streamText({
      model,
      messages: [{ role: 'user', content: 'Test' }],
      maxTokens: 5
    })

    for await (const chunk of result.textStream) {
      if (chunk?.length > 0) {
        mainLogger.info(`Connection test successful for ${provider}`)
        return true
      }
    }
    return false
  } catch (error) {
    mainLogger.error(`Connection test failed for ${provider}:`, error)
    return false
  }
}

// Main orchestration function for AI chat processing
export async function streamAIChat(
  messages: AIMessage[],
  provider?: AIProvider,
  send?: (channel: string, ...args: unknown[]) => void
): Promise<string> {
  // Create and store session
  const session = createStreamSession(messages, provider)

  // If no send function provided, just return session ID (for non-IPC usage)
  if (!send) {
    return session.id
  }

  // Start streaming in the background
  const streamGenerator = streamAIResponse(messages, provider, session.abortController.signal)

  // Process stream chunks asynchronously
  processAIStream(session, send, streamGenerator)

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
