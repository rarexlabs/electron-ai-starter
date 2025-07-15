import { Connection } from '@common/connection'
import type { Result, AIProvider, AIConfig, AISettings, AIMessage, AppEvent } from '@common/types'
import { ok } from '@common/result'
import { dirname } from 'path'
import { getSetting, setSetting, getAllSettings, clearSetting, clearDatabase } from './settings'
import { getDatabasePath, getLogPath } from './paths'
import { backendLogger } from './logger'
import { streamText, abortStream, listAvailableModel, testConnection } from './ai'
import { FACTORY } from './ai/factory'

export class Handler {
  private _rendererConnection: Connection

  constructor({ rendererConnetion }: { rendererConnetion: Connection }) {
    this._rendererConnection = rendererConnetion
  }

  async ping(): Promise<Result<string>> {
    return ok('pong')
  }

  // Database handlers
  async getSetting(key: string): Promise<Result<unknown>> {
    const result = await getSetting(key)
    return ok(result)
  }

  async setSetting(key: string, value: unknown): Promise<Result<void>> {
    await setSetting(key, value)
    return ok(undefined)
  }

  async getAllSettings(): Promise<Result<unknown>> {
    const result = await getAllSettings()
    return ok(result)
  }

  async clearSetting(key: string): Promise<Result<void>> {
    await clearSetting(key)
    return ok(undefined)
  }

  async clearDatabase(): Promise<Result<void, string>> {
    await clearDatabase()
    return ok(undefined)
  }

  async getDatabasePath(): Promise<Result<string>> {
    const dbPath = getDatabasePath()
    return ok(dirname(dbPath))
  }

  async getLogPath(): Promise<Result<string, string>> {
    const logPath = getLogPath()
    return ok(logPath)
  }

  // AI handlers
  async streamAIText(messages: AIMessage[]): Promise<Result<string>> {
    // Get AI settings from database
    const aiSettings = await getSetting<AISettings>('ai')

    if (!aiSettings) throw new Error('No AI setting has been created')

    if (!aiSettings.default_provider)
      throw new Error('No default AI provider found in the settings')

    // Determine which provider to use
    const selectedProvider = aiSettings.default_provider!

    // Get API key for the selected provider
    const apiKeyField = `${selectedProvider}_api_key` as keyof AISettings
    const apiKey = aiSettings[apiKeyField] as string

    if (!apiKey) {
      throw new Error(`API key not found for provider: ${selectedProvider}`)
    }

    // Get model for the selected provider
    const modelField = `${selectedProvider}_model` as keyof AISettings
    const model = (aiSettings[modelField] as string) || FACTORY[selectedProvider].default

    // Create config object
    const config: AIConfig = {
      provider: selectedProvider,
      model,
      apiKey
    }

    const sessionId = await streamText(config, messages, (channel: string, event: AppEvent) => {
      this._rendererConnection.publishEvent(channel, event)
    })
    return ok(sessionId)
  }

  async abortAIText(sessionId: string): Promise<Result<void>> {
    const success = abortStream(sessionId)
    if (success) {
      backendLogger.info(`AI chat session ${sessionId} successfully aborted`)
    } else {
      backendLogger.warn(`L Attempted to abort non-existent session: ${sessionId}`)
    }
    return ok(undefined)
  }

  async getAIModels(provider: AIProvider): Promise<Result<string[]>> {
    const models = await listAvailableModel(provider)
    return ok(models)
  }

  async testAIProviderConnection(config: AIConfig): Promise<Result<boolean>> {
    const result = await testConnection(config)
    return ok(result)
  }
}
