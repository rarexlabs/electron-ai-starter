import { useState } from 'react'
import { ArrowLeft, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface SettingsProps {
  onBack: () => void
}

export function Settings({ onBack }: SettingsProps): React.JSX.Element {
  const [isClearingDatabase, setIsClearingDatabase] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const handleClearDatabase = async (): Promise<void> => {
    if (!confirm('Are you sure you want to clear the database?')) {
      return
    }

    try {
      setIsClearingDatabase(true)
      setMessage(null)

      await window.database.clearDatabase()

      setMessage({
        type: 'success',
        text: 'Database cleared successfully!'
      })
    } catch (error) {
      console.error('Error clearing database:', error)
      setMessage({
        type: 'error',
        text: 'Failed to clear database. Please try again.'
      })
    } finally {
      setIsClearingDatabase(false)
    }
  }

  return (
    <div className="h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="icon" onClick={onBack} disabled={isClearingDatabase}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-4xl font-bold text-gray-900">Settings</h1>
        </div>

        {/* Database Management */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-red-600">Danger Zone</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h3 className="font-medium text-gray-900 mb-2">Clear Database</h3>
                <p className="text-sm text-gray-600 mb-4">
                  This will permanently delete all data from the database and close the application.
                  You will need to restart the application manually. This action cannot be undone.
                </p>
                <Button
                  variant="destructive"
                  onClick={handleClearDatabase}
                  disabled={isClearingDatabase}
                  className="flex items-center gap-2"
                >
                  <Trash2 className="h-4 w-4" />
                  {isClearingDatabase ? 'Clearing...' : 'Clear Database'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Message Display */}
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
