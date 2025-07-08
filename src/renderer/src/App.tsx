import { useState } from 'react'
import { Settings as SettingsIcon } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Settings } from '@/components/Settings'
import { DummyDataManager } from '@/components/DummyDataManager'
import { logger } from '@/lib/logger'

function App(): React.JSX.Element {
  const [currentPage, setCurrentPage] = useState<'home' | 'settings'>('home')


  const handleSettingsClick = (): void => {
    logger.info('Settings page opened')
    setCurrentPage('settings')
  }

  const handleBackToHome = (): void => {
    logger.info('Navigated back to home')
    setCurrentPage('home')
  }

  if (currentPage === 'settings') {
    return <Settings onBack={handleBackToHome} />
  }

  return (
    <div className="h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-4xl font-bold text-gray-900">Electron Starter</h1>
          <Button variant="ghost" size="icon" onClick={handleSettingsClick} className="h-9 w-9">
            <SettingsIcon className="h-4 w-4" />
          </Button>
        </div>

        <Card className="shadow-sm mb-6">
          <CardContent className="p-6 space-y-4">
            <div className="text-sm text-gray-600">Hello World</div>
            <div className="text-xs text-gray-500">
              Click the settings icon in the top right to access application settings.
            </div>
          </CardContent>
        </Card>

        <DummyDataManager />
      </div>
    </div>
  )
}

export default App
