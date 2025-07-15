import { useState, useEffect } from 'react'
import { ArrowLeft, Trash2, FolderOpen } from 'lucide-react'
import { Button } from '@renderer/components/ui/button'
import { isOk, isError } from '@common/result'
import { logger } from '@renderer/lib/logger'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter
} from '@renderer/components/ui/card'
import { AISettings } from './AISettings'

interface SettingsProps {
  onBack: () => void
}

export function Settings({ onBack }: SettingsProps): React.JSX.Element {
  const [isClearingDatabase, setIsClearingDatabase] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [databasePath, setDatabasePath] = useState<string>('')
  const [logPath, setLogPath] = useState<string>('')
  const [isLoadingPaths, setIsLoadingPaths] = useState(true)

  useEffect(() => {
    const loadPaths = async (): Promise<void> => {
      try {
        await window.connectBackend()
        const [dbPathResult, logPathResult] = await Promise.all([
          window.backend.getDatabasePath(),
          window.backend.getLogPath()
        ])

        if (isOk(dbPathResult)) {
          setDatabasePath(dbPathResult.value)
        } else {
          logger.error('Failed to get database path:', dbPathResult.error)
        }

        if (isOk(logPathResult)) {
          setLogPath(logPathResult.value)
        } else {
          logger.error('Failed to get log path:', logPathResult.error)
        }

        if (isError(dbPathResult) || isError(logPathResult)) {
          setMessage({
            type: 'error',
            text: 'Failed to load some file paths'
          })
        }
      } catch (error) {
        logger.error('Failed to load paths:', error)
        setMessage({
          type: 'error',
          text: 'Failed to load file paths'
        })
      } finally {
        setIsLoadingPaths(false)
      }
    }

    loadPaths()
  }, [])

  const handleOpenFolder = async (folderPath: string): Promise<void> => {
    try {
      await window.main.openFolder(folderPath)
    } catch (error) {
      logger.error('Failed to open folder:', error)
      setMessage({
        type: 'error',
        text: 'Failed to open folder'
      })
    }
  }

  const PathDisplay = ({
    title,
    description,
    path
  }: {
    title: string
    description: string
    path: string
  }): React.JSX.Element => (
    <div>
      <h3 className="font-medium text-gray-900 mb-2">{title}</h3>
      <p className="text-sm text-gray-600 mb-3">{description}</p>
      <div className="flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <code className="text-sm bg-gray-100 px-3 py-2 rounded border block truncate">
            {isLoadingPaths ? 'Loading...' : path || 'Path not available'}
          </code>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleOpenFolder(path)}
          disabled={isLoadingPaths || !path}
          className="flex items-center gap-2 shrink-0"
        >
          <FolderOpen className="h-4 w-4" />
          Open Folder
        </Button>
      </div>
    </div>
  )

  const handleClearDatabase = async (): Promise<void> => {
    if (!confirm('Are you sure you want to clear the database?')) {
      return
    }

    try {
      setIsClearingDatabase(true)
      setMessage(null)

      const result = await window.backend.clearDatabase()

      if (isOk(result)) {
        setMessage({
          type: 'success',
          text: 'Database cleared successfully!'
        })
      } else {
        logger.error('Failed to clear database:', result.error)
        setMessage({
          type: 'error',
          text: 'Failed to clear database. Please try again.'
        })
      }
    } catch (error) {
      logger.error('Error clearing database:', error)
      setMessage({
        type: 'error',
        text: 'Failed to clear database. Please try again.'
      })
    } finally {
      setIsClearingDatabase(false)
    }
  }

  return (
    <div className="h-screen bg-gray-50 p-8 overflow-auto">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="icon" onClick={onBack} disabled={isClearingDatabase}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-4xl font-bold text-gray-900">Settings</h1>
        </div>

        <div className="space-y-6">
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle>File Locations</CardTitle>
              <CardDescription>
                View and access the folders where your application data and logs are stored.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <PathDisplay
                  title="Database Location"
                  description="Location where application data is stored"
                  path={databasePath}
                />
                <PathDisplay
                  title="Log Files Location"
                  description="Location where application log files are stored"
                  path={logPath}
                />
              </div>
            </CardContent>
          </Card>

          <AISettings className="shadow-sm" />

          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-red-600">Danger Zone</CardTitle>
              <CardDescription>
                Irreversible actions that will permanently modify your application data.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div>
                <h3 className="font-medium text-gray-900 mb-2">Clear Database</h3>
                <p className="text-sm text-gray-600 mb-4">
                  This will permanently delete all data from the database and close the application.
                  You will need to restart the application manually. This action cannot be undone.
                </p>
              </div>
            </CardContent>
            <CardFooter>
              <Button
                variant="destructive"
                onClick={handleClearDatabase}
                disabled={isClearingDatabase}
                className="flex items-center gap-2"
              >
                <Trash2 className="h-4 w-4" />
                {isClearingDatabase ? 'Clearing...' : 'Clear Database'}
              </Button>
            </CardFooter>
          </Card>
        </div>

        {message && (
          <div
            className={`mt-6 p-4 rounded-md ${
              message.type === 'success'
                ? 'bg-green-50 text-green-800 border border-green-200'
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}
          >
            {message.text}
          </div>
        )}
      </div>
    </div>
  )
}
