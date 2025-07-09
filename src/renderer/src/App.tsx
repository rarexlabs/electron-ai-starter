import { useState } from 'react'
import { Settings as SettingsIcon } from 'lucide-react'
import { Card, CardContent, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Settings } from '@/components/Settings'
import { DummyDataManager } from '@/components/DummyDataManager'
import { ChatInterface } from '@/components/ChatInterface'
import { AIQuickSettings } from '@/components/AIQuickSettings'
import log from 'electron-log/renderer'
import type { AIProvider } from '../../../src/preload/index.d'

function App(): React.JSX.Element {
  const [currentPage, setCurrentPage] = useState<'home' | 'settings'>('home')
  const [currentProvider, setCurrentProvider] = useState<AIProvider>('openai')

  const handleSettingsClick = (): void => {
    log.info('Settings page opened')
    setCurrentPage('settings')
  }

  const handleBackToHome = (): void => {
    log.info('Navigated back to home')
    setCurrentPage('home')
  }

  if (currentPage === 'settings') {
    return <Settings onBack={handleBackToHome} />
  }

  return (
    <div className="h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-4xl font-bold text-gray-900">Electron Starter</h1>
          <Button variant="ghost" size="icon" onClick={handleSettingsClick} className="h-9 w-9">
            <SettingsIcon className="h-4 w-4" />
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column */}
          <div className="space-y-6">
            <Card className="shadow-sm">
              <CardContent className="p-6">
                <div className="text-sm text-gray-600 mb-2">Hello World</div>
                <CardDescription>
                  Welcome to your Electron starter with AI chat capabilities. Configure your AI
                  providers in settings to start chatting.
                </CardDescription>
              </CardContent>
            </Card>

            <DummyDataManager />
          </div>

          {/* Right Column - AI Chat */}
          <div className="space-y-4">
            <AIQuickSettings onProviderChange={setCurrentProvider} />
            <ChatInterface provider={currentProvider} />
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
