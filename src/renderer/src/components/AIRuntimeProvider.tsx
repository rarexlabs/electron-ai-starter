import { AssistantRuntimeProvider, useLocalRuntime } from '@assistant-ui/react'
import type { ChatModelAdapter, ThreadMessage } from '@assistant-ui/react'
import { ReactNode } from 'react'
import { logger } from '@/lib/logger'
import { aiStreamBridge } from '@/lib/ipc-bridge'
import { sessionManager } from '@/lib/session-manager'

const AIModelAdapter: ChatModelAdapter = {
  async *run({ messages, abortSignal }) {
    try {
      // Convert Assistant-ui messages to AIMessage format
      const formattedMessages = messages.map((message: ThreadMessage) => ({
        role: message.role as 'user' | 'assistant' | 'system',
        content: message.content
          .filter((part) => part.type === 'text')
          .map((part) => part.text)
          .join('')
      }))

      logger.info('🚀 Starting AI stream with messages:', formattedMessages.length)

      // Start streaming through the bridge
      const { sessionId, stream } = await aiStreamBridge.startStream(formattedMessages, abortSignal)

      // Create session for tracking
      const sessionAbortController = sessionManager.createSession(sessionId)

      // Set up abort signal forwarding
      if (abortSignal) {
        abortSignal.addEventListener('abort', () => {
          logger.info('🚫 Abort signal received, aborting session:', sessionId)
          sessionManager.abortSession(sessionId)
        })
      }

      let fullContent = ''

      try {
        // Process streaming chunks
        for await (const chunk of stream) {
          // Check if aborted during streaming
          if (abortSignal?.aborted || sessionAbortController.signal.aborted) {
            logger.info('🚫 Stream aborted during processing')
            break
          }

          fullContent += chunk
          yield {
            content: [{ type: 'text', text: fullContent }]
          }
        }

        // Mark session as completed
        sessionManager.completeSession(sessionId)
        logger.info('✅ Stream completed successfully')
      } catch (streamError) {
        const errorMessage = streamError instanceof Error ? streamError.message : 'Stream error'
        sessionManager.errorSession(sessionId, errorMessage)
        throw streamError
      } finally {
        // Clean up session
        sessionManager.cleanupSession(sessionId)
      }

      // Handle abort case
      if (abortSignal?.aborted || sessionAbortController.signal.aborted) {
        logger.info('🚫 Stream was aborted - exiting gracefully')
        return
      }
    } catch (error) {
      // Handle errors gracefully
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred'

      // Don't show error message for abort - it's expected behavior
      if (errorMessage === 'Request was aborted') {
        logger.info('🚫 Stream was aborted - this is expected behavior')
        return // Exit gracefully without yielding error content
      }

      logger.error('❌ AI stream error:', errorMessage)

      // Yield appropriate error messages
      if (errorMessage.includes('API key') || errorMessage.includes('api key')) {
        yield {
          content: [
            {
              type: 'text',
              text: 'Please configure your AI provider API key in Settings to start chatting.'
            }
          ]
        }
      } else {
        yield {
          content: [
            {
              type: 'text',
              text: `Error: ${errorMessage}`
            }
          ]
        }
      }
    }
  }
}

interface AIRuntimeProviderProps {
  children: ReactNode
}

export function AIRuntimeProvider({ children }: AIRuntimeProviderProps): React.JSX.Element {
  const runtime = useLocalRuntime(AIModelAdapter)

  return <AssistantRuntimeProvider runtime={runtime}>{children}</AssistantRuntimeProvider>
}
