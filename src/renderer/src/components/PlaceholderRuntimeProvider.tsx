import { type ReactNode } from 'react'
import { AssistantRuntimeProvider } from '@assistant-ui/react'
import { useLocalRuntime } from '@assistant-ui/react'
import type { ChatModelAdapter } from '@assistant-ui/react'

interface PlaceholderRuntimeProviderProps {
  children: ReactNode
}

// Mock AI adapter that provides placeholder responses
const mockAdapter: ChatModelAdapter = {
  async *run({ messages }) {
    // Get the last user message
    const lastMessage = messages[messages.length - 1]
    const userContent = lastMessage?.content?.[0]

    if (userContent?.type === 'text') {
      const text = userContent.text.toLowerCase()

      // Simulate thinking delay
      await new Promise((resolve) => setTimeout(resolve, 1000))

      // Generate contextual responses based on user input
      let response = ''

      if (text.includes('hello') || text.includes('hi')) {
        response =
          "Hello! I'm a placeholder AI assistant. I'm here to help you test the chat interface. Try asking me about coding, writing, or anything else!"
      } else if (text.includes('code') || text.includes('programming')) {
        response = `Here's a simple example of TypeScript code:

\`\`\`typescript
interface User {
  id: string
  name: string
  email: string
}

const createUser = (userData: Partial<User>): User => {
  return {
    id: crypto.randomUUID(),
    name: userData.name || 'Anonymous',
    email: userData.email || ''
  }
}
\`\`\`

This demonstrates basic TypeScript interfaces and functions. Would you like to see more examples?`
      } else if (text.includes('help') || text.includes('what can you do')) {
        response = `I'm a placeholder assistant that can help you test this chat interface! Here are some things you can try:

• **Ask about code** - I'll show you code examples
• **Test markdown** - I can display formatted text, lists, and more
• **Try copy functionality** - Use the copy button on my messages
• **Edit your messages** - Click the edit button on your messages
• **Ask anything** - I'll provide contextual responses

This is just a demo interface. The real AI integration will come later!`
      } else if (text.includes('markdown') || text.includes('format')) {
        response = `Here are some **markdown formatting** examples:

### Headers and Text
- **Bold text** and *italic text*
- \`inline code\` and code blocks
- [Links](https://example.com) and lists

### Lists
1. Numbered lists
2. Work great
3. For organizing info

• Bullet points
• Are also useful
• For quick lists

> Blockquotes are perfect for highlighting important information or quotes.

The assistant-ui components handle all this formatting automatically!`
      } else if (text.includes('electron') || text.includes('app')) {
        response = `This is an Electron application with assistant-ui integration! Here's what makes it special:

**Frontend Stack:**
- ⚛️ React 19 with TypeScript
- 🎨 Tailwind CSS 4 for styling
- 🧩 Shadcn/ui component library
- 💬 Assistant-ui for chat interface

**Backend Features:**
- 🖥️ Electron main process
- 💾 SQLite database with Drizzle ORM
- 🔧 AI provider integration (OpenAI, Anthropic, Google)
- 📝 Electron-log for logging

This chat interface will eventually connect to your configured AI providers!`
      } else {
        response = `Thanks for your message: "${userContent.text}"

I'm a placeholder AI assistant built into this Electron app. While I can't provide real AI responses yet, I can help you test all the chat interface features:

- **Markdown rendering** with code highlighting
- **Message editing** and conversation flow  
- **Copy functionality** for messages
- **Responsive design** that works great

Once the real AI backend is connected, you'll be able to have actual conversations with AI models like GPT-4, Claude, or Gemini based on your settings configuration.

Feel free to test more features!`
      }

      // Stream the response character by character for realistic feel
      for (let i = 0; i <= response.length; i++) {
        yield {
          content: [{ type: 'text', text: response.slice(0, i) }]
        }

        // Add small delay between characters for streaming effect
        if (i < response.length) {
          await new Promise((resolve) => setTimeout(resolve, 20))
        }
      }
    }
  }
}

export function PlaceholderRuntimeProvider({ children }: PlaceholderRuntimeProviderProps): React.JSX.Element {
  const runtime = useLocalRuntime(mockAdapter)

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      {children}
    </AssistantRuntimeProvider>
  )
}
