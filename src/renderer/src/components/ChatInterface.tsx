import { useState, useCallback, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Send, Bot, User, Loader2 } from 'lucide-react'
import type { AIMessage, AIProvider, AISettings } from '../../../preload/index.d'
import { logger } from '@/lib/logger'

interface ChatMessage extends AIMessage {
  id: string
  timestamp: number
}

interface ChatInterfaceProps {
  className?: string
}

export function ChatInterface({ className = '' }: ChatInterfaceProps): React.JSX.Element {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentProvider, setCurrentProvider] = useState<AIProvider>('openai')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Load current provider from settings
  useEffect(() => {
    const loadProvider = async (): Promise<void> => {
      try {
        const aiSettings = ((await window.database.getSetting('ai')) as AISettings) || {}
        const savedProvider = aiSettings.default_provider
        setCurrentProvider(savedProvider || 'openai')
      } catch (err) {
        logger.error('Failed to load provider:', err)
        setCurrentProvider('openai')
      }
    }
    loadProvider()
  }, [])

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      if (!input.trim() || isStreaming) return

      const userMessage: ChatMessage = {
        id: Date.now().toString(),
        role: 'user',
        content: input.trim(),
        timestamp: Date.now()
      }

      setMessages((prev) => [...prev, userMessage])
      setInput('')
      setIsStreaming(true)
      setError(null)

      try {
        // Prepare messages for AI
        const aiMessages: AIMessage[] = [
          ...messages.map((msg) => ({ role: msg.role, content: msg.content })),
          { role: 'user', content: userMessage.content }
        ]

        // Create placeholder for assistant message
        const assistantMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: '',
          timestamp: Date.now()
        }

        // Add assistant message to display streaming content
        setMessages((prev) => [...prev, assistantMessage])

        // Stream response from main process
        await window.ai.streamChat(
          aiMessages,
          currentProvider,
          // onChunk: update message content directly
          (chunk: string) => {
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === assistantMessage.id ? { ...msg, content: msg.content + chunk } : msg
              )
            )
          },
          // onEnd: streaming complete
          () => {
            // Streaming is complete
            setIsStreaming(false)
          },
          // onError: handle streaming errors
          (error: string) => {
            setError(error)
            // Remove the placeholder message on error
            setMessages((prev) => prev.filter((msg) => msg.id !== assistantMessage.id))
          }
        )
      } catch (err) {
        logger.error('Chat error:', err)
        const errorMessage =
          err instanceof Error && err.message.includes('API key')
            ? `Please configure your ${currentProvider} API key in settings`
            : err instanceof Error &&
                (err.message.includes('network') || err.message.includes('fetch'))
              ? 'Network error. Please check your internet connection'
              : err instanceof Error
                ? err.message
                : 'Failed to get AI response'
        setError(errorMessage)
      } finally {
        // Error handling will reset streaming state
        setIsStreaming(false)
      }
    },
    [input, isStreaming, messages, currentProvider]
  )

  const clearChat = useCallback(() => {
    setMessages([])
    setError(null)
  }, [])

  return (
    <Card className={`flex flex-col h-96 ${className}`}>
      <CardContent className="flex flex-col h-full p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-blue-600" />
            <h3 className="font-semibold">AI Chat ({currentProvider})</h3>
          </div>
          <Button variant="ghost" size="sm" onClick={clearChat} disabled={isStreaming}>
            Clear
          </Button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto space-y-3 mb-4">
          {messages.length === 0 && !isStreaming && !error && (
            <div className="text-center text-gray-500 py-8">
              Start a conversation with AI
              <div className="text-sm mt-2">
                Using {currentProvider} - configure in settings if needed
              </div>
            </div>
          )}

          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex items-start gap-2 ${
                message.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              {message.role === 'assistant' && (
                <Bot className="h-4 w-4 text-blue-600 mt-1 flex-shrink-0" />
              )}
              <div
                className={`max-w-[80%] px-3 py-2 rounded-lg ${
                  message.role === 'user' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-900'
                }`}
              >
                {message.content || (
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    <span className="text-sm text-gray-500">AI is typing...</span>
                  </div>
                )}
                {/* Show cursor when streaming and this is the last assistant message */}
                {message.role === 'assistant' &&
                  isStreaming &&
                  message.id === messages[messages.length - 1]?.id &&
                  message.content && (
                    <span className="inline-block w-1 h-4 bg-blue-600 animate-pulse ml-1" />
                  )}
              </div>
              {message.role === 'user' && (
                <User className="h-4 w-4 text-gray-600 mt-1 flex-shrink-0" />
              )}
            </div>
          ))}

          <div ref={messagesEndRef} />
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-700">{error}</p>
            <Button variant="outline" size="sm" onClick={() => setError(null)} className="mt-2">
              Dismiss
            </Button>
          </div>
        )}

        {/* Input form */}
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message..."
            disabled={isStreaming}
            className="flex-1"
          />
          <Button type="submit" disabled={!input.trim() || isStreaming} size="icon">
            {isStreaming ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
