import { AssistantRuntimeProvider, useLocalRuntime } from '@assistant-ui/react'
import type { ChatModelAdapter, ThreadMessage } from '@assistant-ui/react'
import { ReactNode } from 'react'
import { logger } from '@/lib/logger'

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

      let fullContent = ''
      const chunkQueue: string[] = []
      let completed = false
      let error: string | null = null
      let resolveNext: (() => void) | null = null
      let aborted = false

      let sessionId: string | null = null
      
      // Set up abort signal listener to resolve pending promises
      const abortListener = () => {
        logger.info('🚫 RENDERER: Abort signal received in AIRuntimeProvider')
        aborted = true
        if (resolveNext) {
          const resolve = resolveNext
          resolveNext = null
          resolve()
        }
        // If we have a session ID, send abort request to main process
        if (sessionId) {
          logger.info('🚫 RENDERER: Sending abort request to main process for session:', sessionId)
          window.ai.abortChat(sessionId).catch((error) => {
            logger.error('Failed to abort chat session:', error)
          })
        }
      }

      if (abortSignal) {
        abortSignal.addEventListener('abort', abortListener)
      }

      // Start the streaming request with event-driven chunk handling
      const streamPromise = window.ai.streamChat(
        formattedMessages,
        undefined, // provider - will use default from settings
        (chunk: string) => {
          chunkQueue.push(chunk)
          fullContent += chunk
          if (resolveNext) {
            const resolve = resolveNext
            resolveNext = null
            resolve()
          }
        },
        () => {
          completed = true
          if (resolveNext) {
            const resolve = resolveNext
            resolveNext = null
            resolve()
          }
        },
        (err: string) => {
          error = err
          if (resolveNext) {
            const resolve = resolveNext
            resolveNext = null
            resolve()
          }
        },
        (id: string) => {
          // Session ID callback - store it for abort functionality
          sessionId = id
        }
      )

      // Process chunks as they arrive without polling
      while (!completed && !error && !aborted && !abortSignal.aborted) {
        if (chunkQueue.length > 0) {
          // Consume all available chunks
          chunkQueue.length = 0
          yield {
            content: [{ type: 'text', text: fullContent }]
          }
        } else {
          // Wait for next chunk or completion
          await new Promise<void>((resolve) => {
            resolveNext = resolve
            // Also resolve if aborted to prevent hanging
            if (abortSignal.aborted || aborted) {
              resolve()
            }
          })
        }
      }

      // Clean up abort listener
      if (abortSignal && abortListener) {
        abortSignal.removeEventListener('abort', abortListener)
      }

      // Handle abort signal
      if (abortSignal.aborted || aborted) {
        throw new Error('Request was aborted')
      }

      // Handle completion or error
      if (error) {
        throw new Error(error)
      }

      // Wait for the promise to complete and yield final content only if not aborted
      if (!abortSignal.aborted && !aborted) {
        await streamPromise
        if (fullContent) {
          yield {
            content: [{ type: 'text', text: fullContent }]
          }
        }
      }
    } catch (error) {
      // Handle errors gracefully
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred'

      // Don't show error message for abort - it's expected behavior
      if (errorMessage === 'Request was aborted') {
        logger.info('🚫 RENDERER: Stream was aborted - this is expected behavior')
        return // Exit gracefully without yielding error content
      }

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
