import type { AIProvider, AIMessage } from '../../types/ai'
import {
  createStreamSession,
  cleanupStreamSession,
  processAIStream,
  streamAIResponse,
  activeStreamSessions
} from './stream'

// Re-export all functions from config and stream modules
export * from './config'
export * from './stream'

// Main orchestration function for AI chat processing
export async function processAIChat(
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
