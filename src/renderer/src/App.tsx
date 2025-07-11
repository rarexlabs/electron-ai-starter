import { useState } from 'react'
import { Settings as SettingsIcon, MessageCircle } from 'lucide-react'
import { Card, CardContent, CardDescription } from '@renderer/components/ui/card'
import { Button } from '@renderer/components/ui/button'
import { Settings } from '@renderer/components/Settings'
import { DummyDataManager } from '@renderer/components/DummyDataManager'
import { ChatPage } from '@renderer/components/ChatPage'
import log from 'electron-log/renderer'

function App(): React.JSX.Element {
  const [currentPage, setCurrentPage] = useState<'home' | 'settings' | 'chat'>('home')

  const handleSettingsClick = (): void => {
    log.info('Settings page opened')
    setCurrentPage('settings')
  }

  const handleChatClick = (): void => {
    log.info('Chat page opened')
    setCurrentPage('chat')
  }

  const handleBackToHome = (): void => {
    log.info('Navigated back to home')
    setCurrentPage('home')
  }

  if (currentPage === 'settings') {
    return <Settings onBack={handleBackToHome} />
  }

  if (currentPage === 'chat') {
    return <ChatPage onBack={handleBackToHome} />
  }

  return (
    <div className="h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-4xl font-bold text-gray-900">Electron Starter</h1>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleChatClick} className="flex items-center gap-2">
              <MessageCircle className="h-4 w-4" />
              Chat
            </Button>
            <Button variant="ghost" size="icon" onClick={handleSettingsClick} className="h-9 w-9">
              <SettingsIcon className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="space-y-6">
          <Card className="shadow-sm">
            <CardContent className="p-6">
              <div className="text-sm text-gray-600 mb-2">Hello World</div>
              <CardDescription>
                Welcome to your Electron starter with AI chat capabilities. Configure your AI
                providers in settings, then click the Chat button above to start a conversation.
              </CardDescription>
            </CardContent>
          </Card>

          <DummyDataManager />
        </div>
      </div>
    </div>
  )
}

export default App
