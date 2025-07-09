import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckCircle, Loader2, Settings } from 'lucide-react'
import type { AIProvider } from '../../../preload/index.d'
import { logger } from '@/lib/logger'

interface AIQuickSettingsProps {
  onProviderChange?: (provider: AIProvider) => void
  className?: string
}

export function AIQuickSettings({
  onProviderChange,
  className = ''
}: AIQuickSettingsProps): React.JSX.Element {
  const [selectedProvider, setSelectedProvider] = useState<AIProvider>('openai')
  const [apiKey, setApiKey] = useState('')
  const [model, setModel] = useState('')
  const [models, setModels] = useState<string[]>([])
  const [isTesting, setIsTesting] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [connectionTestSuccess, setConnectionTestSuccess] = useState(false)

  const loadSettings = useCallback(async (): Promise<void> => {
    try {
      // Load default provider
      const savedProvider = await window.database.getSetting('ai', 'default_provider')
      const currentProvider = (savedProvider as AIProvider) || 'openai'

      if (savedProvider) {
        setSelectedProvider(currentProvider)
      }

      // Load current provider settings
      await loadProviderSettings(currentProvider)
    } catch (error) {
      logger.error('Failed to load AI settings:', error)
    }
  }, [])

  const loadModels = useCallback(async (): Promise<void> => {
    try {
      const availableModels = await window.ai.getModels(selectedProvider)
      setModels(availableModels)
      if (!model && availableModels.length > 0) {
        setModel(availableModels[0])
      }
    } catch (error) {
      logger.error('Failed to load models:', error)
    }
  }, [selectedProvider, model])

  const loadProviderSettings = async (provider: AIProvider): Promise<void> => {
    const savedApiKey = await window.database.getSetting('ai', `${provider}_api_key`)
    const savedModel = await window.database.getSetting('ai', `${provider}_model`)
    const availableModels = await window.ai.getModels(provider)

    setApiKey(savedApiKey || '')
    setModel(savedModel || availableModels[0] || 'gpt-4o')
  }

  const handleProviderChange = async (provider: AIProvider): Promise<void> => {
    setSelectedProvider(provider)
    await loadProviderSettings(provider)
    onProviderChange?.(provider)
  }

  const testConnection = async (): Promise<void> => {
    if (!apiKey) return

    setIsTesting(true)
    setConnectionTestSuccess(false)
    try {
      // Save temporarily for testing
      await window.database.setSetting('ai', `${selectedProvider}_api_key`, apiKey)
      await window.database.setSetting('ai', `${selectedProvider}_model`, model)

      const connected = await window.ai.testConnection(selectedProvider)

      if (connected) {
        setConnectionTestSuccess(true)
        // Reset success state after 3 seconds
        setTimeout(() => {
          setConnectionTestSuccess(false)
        }, 3000)
      }
    } catch (error) {
      logger.error(`Failed to test ${selectedProvider} connection:`, error)
    } finally {
      setIsTesting(false)
    }
  }

  const saveSettings = async (): Promise<void> => {
    setIsSaving(true)
    try {
      await window.database.setSetting('ai', 'default_provider', selectedProvider)
      await window.database.setSetting('ai', `${selectedProvider}_api_key`, apiKey)
      await window.database.setSetting('ai', `${selectedProvider}_model`, model)

      // Test connection after saving
      await testConnection()

      setShowSettings(false)
    } catch (error) {
      logger.error('Failed to save settings:', error)
    } finally {
      setIsSaving(false)
    }
  }

  // Load settings on component mount
  useEffect(() => {
    loadSettings()
  }, [loadSettings])

  // Load models when provider changes
  useEffect(() => {
    loadModels()
  }, [selectedProvider, loadModels])

  if (!showSettings) {
    return (
      <Card className={className}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">AI Assistant</CardTitle>
              <CardDescription>Using {selectedProvider}</CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSettings(true)}
              className="flex items-center gap-2"
            >
              <Settings className="h-4 w-4" />
              Configure
            </Button>
          </div>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Configure AI Assistant</CardTitle>
          <Button variant="outline" size="sm" onClick={() => setShowSettings(false)}>
            Done
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="provider">Provider</Label>
            <Select value={selectedProvider} onValueChange={handleProviderChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select provider" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="openai">OpenAI</SelectItem>
                <SelectItem value="anthropic">Anthropic</SelectItem>
                <SelectItem value="google">Google</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="model">Model</Label>
            <Select value={model} onValueChange={setModel}>
              <SelectTrigger>
                <SelectValue placeholder="Select model" />
              </SelectTrigger>
              <SelectContent>
                {models.map((modelId) => (
                  <SelectItem key={modelId} value={modelId}>
                    {modelId}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="api-key">API Key</Label>
          <Input
            id="api-key"
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="Enter your API key"
          />
        </div>

        <div className="flex items-center justify-between">
          <Button
            onClick={() => testConnection()}
            disabled={!apiKey || isTesting}
            variant={connectionTestSuccess ? 'default' : 'outline'}
            size="sm"
            className={connectionTestSuccess ? 'bg-green-600 hover:bg-green-700 text-white' : ''}
          >
            {isTesting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Testing...
              </>
            ) : connectionTestSuccess ? (
              <>
                <CheckCircle className="h-4 w-4" />
                Connection Successful!
              </>
            ) : (
              'Test Connection'
            )}
          </Button>

          <Button onClick={saveSettings} disabled={!apiKey || isSaving} size="sm">
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Settings'
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
