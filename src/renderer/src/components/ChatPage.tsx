import { ArrowLeft, MessageCircle } from 'lucide-react'
import { Button } from '@renderer/components/ui/button'
import { Thread } from '@renderer/components/assistant-ui/thread'
import { AIRuntimeProvider } from '@renderer/components/AIRuntimeProvider'

interface ChatPageProps {
  onBack: () => void
}

export function ChatPage({ onBack }: ChatPageProps): React.JSX.Element {
  return (
    <div className="h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={onBack} className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            <div className="h-6 w-px bg-border" />
            <div className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-primary" />
              <h1 className="text-lg font-semibold">AI Assistant</h1>
            </div>
          </div>
        </div>
      </header>

      {/* Chat Interface */}
      <main className="flex-1 overflow-hidden">
        <AIRuntimeProvider>
          <Thread />
        </AIRuntimeProvider>
      </main>
    </div>
  )
}
