import { AssistantRuntimeProvider, useLocalRuntime } from '@assistant-ui/react'
import type { ChatModelAdapter, ThreadMessage } from '@assistant-ui/react'
import { ReactNode } from 'react'
import { logger } from '@/lib/logger'
import { streamResponse } from '@renderer/lib/ai-chat'

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

    logger.info('🚀 Starting AI stream with message count: ', formattedMessages.length)
    const stream = await streamResponse(formattedMessages, abortSignal)

    let fullContent = ''
    for await (const chunk of stream) {
      if (abortSignal?.aborted) {
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
