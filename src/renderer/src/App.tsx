import { useState, useEffect } from 'react'
import { Settings as SettingsIcon, MessageCircle, Database } from 'lucide-react'
import { Button } from '@renderer/components/ui/button'
import { Settings } from '@renderer/components/Settings'
import { DummyDataPage } from '@renderer/components/DummyDataPage'
import { ChatPage } from '@renderer/components/ChatPage'
import { logger } from '@renderer/lib/logger'
import { isOk } from '@common/result'

function App(): React.JSX.Element {
  const [currentPage, setCurrentPage] = useState<'home' | 'settings' | 'chat' | 'dummyData'>('home')
  const [backendConnected, setBackendConnected] = useState(false)
  const [isConnecting, setIsConnecting] = useState(true)

  // Connect to backend and test communication
  useEffect(() => {
    const connectToBackend = async (): Promise<void> => {
      await window.connectBackend()
      setBackendConnected(true)
      setIsConnecting(false)
      const result = await window.backend.ping()
      if (isOk(result)) {
        logger.info(`✅ Backend ping successful: ${result.value}`)
      }
    }

    connectToBackend()
  }, [])

  const handleSettingsClick = (): void => {
    logger.info('Settings page opened')
    setCurrentPage('settings')
  }

  const handleChatClick = (): void => {
    logger.info('Chat page opened')
    setCurrentPage('chat')
  }

  const handleDummyDataClick = (): void => {
    logger.info('Dummy Data page opened')
    setCurrentPage('dummyData')
  }

  const handleBackToHome = (): void => {
    logger.info('Navigated back to home')
    setCurrentPage('home')
  }

  // Show loading state while connecting to backend
  if (isConnecting) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-blue-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-2xl font-semibold text-gray-700 dark:text-gray-200 mb-4">
            Connecting to backend...
          </div>
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
        </div>
      </div>
    )
  }

  // Show error state if backend connection failed
  if (!backendConnected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-red-50 dark:from-gray-900 dark:via-gray-800 dark:to-red-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-2xl font-semibold text-red-700 dark:text-red-300 mb-4">
            Failed to connect to backend
          </div>
          <p className="text-gray-600 dark:text-gray-400">
            Please check the logs for more information.
          </p>
        </div>
      </div>
    )
  }

  if (currentPage === 'settings') {
    return <Settings onBack={handleBackToHome} />
  }

  if (currentPage === 'chat') {
    return <ChatPage onBack={handleBackToHome} />
  }

  if (currentPage === 'dummyData') {
    return <DummyDataPage onBack={handleBackToHome} />
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-blue-900 relative overflow-hidden">
      {/* Animated background particles */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 left-20 w-72 h-72 bg-blue-400/20 rounded-full mix-blend-multiply filter blur-xl animate-pulse"></div>
        <div className="absolute top-40 right-20 w-72 h-72 bg-purple-400/20 rounded-full mix-blend-multiply filter blur-xl animate-pulse delay-1000"></div>
        <div className="absolute -bottom-8 left-40 w-72 h-72 bg-pink-400/20 rounded-full mix-blend-multiply filter blur-xl animate-pulse delay-2000"></div>
      </div>

      <div className="relative z-10 p-8">
        <div className="max-w-6xl mx-auto">
          {/* Settings button positioned absolutely */}
          <div className="absolute top-8 right-8">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleSettingsClick}
              className="h-9 w-9 backdrop-blur-sm bg-white/10 hover:bg-white/20 transition-all duration-300"
            >
              <SettingsIcon className="h-4 w-4" />
            </Button>
          </div>

          {/* Hero Section */}
          <div className="text-center pt-16 pb-20">
            <div className="space-y-6">
              <h1 className="text-6xl md:text-7xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-blue-800 bg-clip-text text-transparent">
                Electron AI Starter
              </h1>
              <div className="text-2xl md:text-3xl font-semibold text-gray-700 dark:text-gray-200">
                Stop scaffolding, start building!
              </div>
              <p className="text-lg md:text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto leading-relaxed">
                Modern desktop apps with TypeScript, React, Sqlite and AI
              </p>
            </div>
          </div>

          {/* Demo Section */}
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-800 dark:text-gray-100 mb-8">
              Explore Template
            </h2>
            <div className="flex flex-wrap justify-center gap-4">
              <Button
                variant="outline"
                onClick={handleChatClick}
                className="flex items-center gap-2 backdrop-blur-sm bg-white/50 hover:bg-white/80 border-2 border-blue-200 hover:border-blue-400 transition-all duration-300"
              >
                <MessageCircle className="h-4 w-4" />
                Chat Demo
              </Button>
              <Button
                variant="outline"
                onClick={handleDummyDataClick}
                className="flex items-center gap-2 backdrop-blur-sm bg-white/50 hover:bg-white/80 border-2 border-purple-200 hover:border-purple-400 transition-all duration-300"
              >
                <Database className="h-4 w-4" />
                Database Demo
              </Button>
              <Button
                variant="outline"
                onClick={handleSettingsClick}
                className="flex items-center gap-2 backdrop-blur-sm bg-white/50 hover:bg-white/80 border-2 border-green-200 hover:border-green-400 transition-all duration-300"
              >
                <SettingsIcon className="h-4 w-4" />
                Settings
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
