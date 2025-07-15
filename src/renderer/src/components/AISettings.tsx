import { useState, useEffect, useCallback } from 'react'
import { Button } from '@renderer/components/ui/button'
import { Input } from '@renderer/components/ui/input'
import { Label } from '@renderer/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@renderer/components/ui/select'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@renderer/components/ui/card'
import { CheckCircle, Loader2, Trash2, XCircle } from 'lucide-react'
import type { AIProvider, AISettings, AIConfig } from '@common/types'
import { logger } from '@renderer/lib/logger'

interface AISettingsProps {
  onProviderChange?: (provider: AIProvider) => void
  className?: string
}

export function AISettings({
  onProviderChange,
  className = ''
}: AISettingsProps): React.JSX.Element {
  const [selectedProvider, setSelectedProvider] = useState<AIProvider>('openai')
  const [apiKey, setApiKey] = useState('')
  const [model, setModel] = useState('')
  const [models, setModels] = useState<string[]>([])
  const [isTesting, setIsTesting] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [connectionTestSuccess, setConnectionTestSuccess] = useState(false)
  const [connectionTestError, setConnectionTestError] = useState(false)
  const [isClearing, setIsClearing] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)

  const loadSettings = useCallback(async (): Promise<void> => {
    try {
      await window.connectBackend()
      const aiSettings = ((await window.backend.getSetting('ai')) as AISettings) || {}
      const currentProvider = aiSettings.default_provider || 'openai'
      setSelectedProvider(currentProvider)
      await loadProviderSettings(currentProvider, aiSettings)
    } catch (error) {
      logger.error('Failed to load AI settings:', error)
    }
  }, [])

  const loadModels = useCallback(async (): Promise<void> => {
    try {
      const availableModels = await window.backend.getAIModels(selectedProvider)
      setModels(availableModels)
      if (!model && availableModels.length > 0) {
        setModel(availableModels[0])
      }
    } catch (error) {
      logger.error('Failed to load models:', error)
    }
  }, [selectedProvider, model])

  const loadProviderSettings = async (
    provider: AIProvider,
    aiSettings?: AISettings
  ): Promise<void> => {
    const settings = aiSettings || ((await window.backend.getSetting('ai')) as AISettings) || {}
    const availableModels = await window.backend.getAIModels(provider)

    setApiKey(settings[`${provider}_api_key`] || '')
    setModel(settings[`${provider}_model`] || availableModels[0] || 'gpt-4o')
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
    setConnectionTestError(false)
    try {
      const config: AIConfig = {
        provider: selectedProvider,
        model: model,
        apiKey: apiKey
      }

      const connected = await window.backend.testAIProviderConnection(config)

      if (connected) {
        setConnectionTestSuccess(true)
        setTimeout(() => setConnectionTestSuccess(false), 3000)
      } else {
        setConnectionTestError(true)
        setTimeout(() => setConnectionTestError(false), 3000)
      }
    } catch (error) {
      logger.error(`Failed to test ${selectedProvider} connection:`, error)
      setConnectionTestError(true)
      setTimeout(() => setConnectionTestError(false), 5000)
    } finally {
      setIsTesting(false)
    }
  }

  const saveSettings = async (): Promise<void> => {
    setIsSaving(true)
    setSaveSuccess(false)
    try {
      const currentAiSettings = (await window.backend.getSetting('ai')) || {}
      const updatedSettings = {
        ...currentAiSettings,
        default_provider: selectedProvider,
        [`${selectedProvider}_api_key`]: apiKey,
        [`${selectedProvider}_model`]: model
      }

      await window.backend.setSetting('ai', updatedSettings)
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch (error) {
      logger.error('Failed to save settings:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const clearSettings = async (): Promise<void> => {
    const confirmed = confirm(
      'Clear all AI settings?\n\nThis will remove all API keys and reset settings to defaults. This action cannot be undone.'
    )

    if (!confirmed) return

    setIsClearing(true)
    try {
      await window.backend.clearSetting('ai')
      setSelectedProvider('openai')
      setApiKey('')
      setModel('')
      setModels([])
      setConnectionTestSuccess(false)
      setConnectionTestError(false)
      setSaveSuccess(false)
      onProviderChange?.('openai')
      logger.info('AI settings cleared successfully')
    } catch (error) {
      logger.error('Failed to clear AI settings:', error)
    } finally {
      setIsClearing(false)
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

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">AI Assistant</CardTitle>
        <CardDescription>Configure your AI provider and model settings</CardDescription>
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
          <div className="flex items-center gap-2">
            <Button
              onClick={() => testConnection()}
              disabled={!apiKey || isTesting}
              variant={
                connectionTestSuccess ? 'default' : connectionTestError ? 'destructive' : 'outline'
              }
              size="sm"
              className={
                connectionTestSuccess
                  ? 'bg-green-600 hover:bg-green-700 text-white'
                  : connectionTestError
                    ? 'bg-orange-500 hover:bg-orange-600 text-white'
                    : ''
              }
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
              ) : connectionTestError ? (
                <>
                  <XCircle className="h-4 w-4" />
                  Connection Failed
                </>
              ) : (
                'Test Connection'
              )}
            </Button>

            <Button
              onClick={clearSettings}
              disabled={isClearing}
              variant="outline"
              size="sm"
              className="text-red-600 hover:text-red-700"
            >
              {isClearing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
            </Button>
          </div>

          <Button
            onClick={saveSettings}
            disabled={!apiKey || isSaving}
            size="sm"
            variant={saveSuccess ? 'default' : 'default'}
            className={saveSuccess ? 'bg-green-600 hover:bg-green-700 text-white' : ''}
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : saveSuccess ? (
              <>
                <CheckCircle className="h-4 w-4" />
                Settings Saved!
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
