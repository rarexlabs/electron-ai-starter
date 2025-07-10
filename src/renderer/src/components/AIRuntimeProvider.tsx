import { AssistantRuntimeProvider, useLocalRuntime } from '@assistant-ui/react'
import type { ChatModelAdapter, ThreadMessage } from '@assistant-ui/react'
import { ReactNode } from 'react'

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
      const chunks: string[] = []
      let isComplete = false
      let hasError = false
      let errorMessage = ''

      // Start the streaming request
      const streamPromise = window.ai.streamChat(
        formattedMessages,
        undefined, // provider - will use default from settings
        (chunk: string) => {
          chunks.push(chunk)
        },
        () => {
          isComplete = true
        },
        (error: string) => {
          hasError = true
          errorMessage = error
        }
      )

      // Process chunks as they arrive
      let processedIndex = 0
      while (!isComplete && !hasError && !abortSignal.aborted) {
        // Check for new chunks
        if (chunks.length > processedIndex) {
          const newChunks = chunks.slice(processedIndex)
          processedIndex = chunks.length

          for (const chunk of newChunks) {
            fullContent += chunk
            yield {
              content: [{ type: 'text', text: fullContent }]
            }
          }
        }

        // Small delay to prevent busy waiting
        await new Promise((resolve) => setTimeout(resolve, 10))
      }

      // Wait for the stream to complete
      await streamPromise

      // Check for errors after completion
      if (hasError) {
        throw new Error(errorMessage)
      }

      // Handle any final chunks that might have arrived
      if (chunks.length > processedIndex) {
        const finalChunks = chunks.slice(processedIndex)
        for (const chunk of finalChunks) {
          fullContent += chunk
        }
        yield {
          content: [{ type: 'text', text: fullContent }]
        }
      }
    } catch (error) {
      // Handle errors gracefully
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred'

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
