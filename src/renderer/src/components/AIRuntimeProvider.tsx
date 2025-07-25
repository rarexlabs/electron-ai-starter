import { AssistantRuntimeProvider, useLocalRuntime } from '@assistant-ui/react'
import type { ChatModelAdapter, ThreadMessage } from '@assistant-ui/react'
import { ReactNode } from 'react'
import { logger } from '@renderer/lib/logger'
import { streamText } from '@renderer/lib/ai'

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

    logger.info(`Starting AI stream with ${formattedMessages.length} messages`)
    const stream = await streamText(formattedMessages, abortSignal)

    const contentChunks: string[] = []
    for await (const chunk of stream) {
      if (abortSignal?.aborted) return
      contentChunks.push(chunk)
      yield { content: [{ type: 'text', text: contentChunks.join('') }] }
    }

    logger.info('AI stream completed')
  }
}

interface AIRuntimeProviderProps {
  children: ReactNode
}

export function AIRuntimeProvider({ children }: AIRuntimeProviderProps): React.JSX.Element {
  const runtime = useLocalRuntime(AIModelAdapter)

  return <AssistantRuntimeProvider runtime={runtime}>{children}</AssistantRuntimeProvider>
}
