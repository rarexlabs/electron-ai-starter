import { AssistantRuntimeProvider, useLocalRuntime } from '@assistant-ui/react'
import type { ChatModelAdapter, ThreadMessage } from '@assistant-ui/react'
import { ReactNode } from 'react'
import { logger } from '@/lib/logger'
import { aiChatStream } from '@/lib/ipc-bridge'

const AIModelAdapter: ChatModelAdapter = {
  async *run({ messages, abortSignal }) {
    // Convert Assistant-ui messages to AIMessage format
    const formattedMessages = messages.map((message: ThreadMessage) => ({
      role: message.role as 'user' | 'assistant' | 'system',
      content: message.content
        .filter((part) => part.type === 'text')
        .map((part) => part.text)
        .join('')
    }))

    logger.info('🚀 Starting AI stream with messages:', formattedMessages.length)

    // Start streaming through the bridge - all session management is handled internally
    const { stream, isAborted } = await aiChatStream.start(formattedMessages, abortSignal)

    let fullContent = ''

    // Process streaming chunks
    for await (const chunk of stream) {
      // Check if aborted during streaming
      if (isAborted()) {
        logger.info('🚫 Stream aborted during processing')
        return
      }

      fullContent += chunk
      yield {
        content: [{ type: 'text', text: fullContent }]
      }
    }

    logger.info('✅ Stream completed successfully')
  }
}

interface AIRuntimeProviderProps {
  children: ReactNode
}

export function AIRuntimeProvider({ children }: AIRuntimeProviderProps): React.JSX.Element {
  const runtime = useLocalRuntime(AIModelAdapter)

  return <AssistantRuntimeProvider runtime={runtime}>{children}</AssistantRuntimeProvider>
}
