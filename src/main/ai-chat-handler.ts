import { createOpenAI } from '@ai-sdk/openai'
import { createAnthropic } from '@ai-sdk/anthropic'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { streamText, type LanguageModelV1 } from 'ai'
import { getSetting } from './settings'
import { mainLogger } from './logger'
import type { AIProvider, AIMessage, AISettings } from '../types/ai'

const MODEL_CONFIG = {
  openai: {
    default: 'gpt-4o',
    available: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-4', 'gpt-3.5-turbo'],
    createModel: (apiKey: string, model: string) => createOpenAI({ apiKey })(model)
  },
  anthropic: {
    default: 'claude-3-5-sonnet-20241022',
    available: [
      'claude-3-5-sonnet-20241022',
      'claude-3-5-haiku-20241022',
      'claude-3-opus-20240229',
      'claude-3-sonnet-20240229',
      'claude-3-haiku-20240307'
    ],
    createModel: (apiKey: string, model: string) => createAnthropic({ apiKey })(model)
  },
  google: {
    default: 'gemini-1.5-pro',
    available: ['gemini-1.5-pro', 'gemini-1.5-flash', 'gemini-pro', 'gemini-pro-vision'],
    createModel: (apiKey: string, model: string) => createGoogleGenerativeAI({ apiKey })(model)
  }
}

async function createModel(provider: AIProvider): Promise<LanguageModelV1> {
  const aiSettings = (await getSetting('ai')) || {}
  const apiKey = aiSettings[`${provider}_api_key`]
  const model = aiSettings[`${provider}_model`]

  if (!apiKey) {
    throw new Error(`API key not found for ${provider}`)
  }

  const config = MODEL_CONFIG[provider]
  return config.createModel(apiKey, model || config.default)
}

export async function* streamAIResponse(
  messages: AIMessage[],
  provider?: AIProvider,
  abortSignal?: AbortSignal
): AsyncGenerator<string, void, unknown> {
  const aiSettings = ((await getSetting('ai')) as AISettings) || {}
  const currentProvider = provider || aiSettings.default_provider || 'openai'

  try {
    const model = await createModel(currentProvider)

    // Add abort signal listener for logging
    if (abortSignal) {
      abortSignal.addEventListener('abort', () => {
        mainLogger.info(
          `🚫 ABORT SIGNAL RECEIVED - Cancelling AI provider request for ${currentProvider}`
        )
        mainLogger.info('🚫 This should prevent further token consumption from the AI provider')
      })
    }

    const result = streamText({
      model,
      messages,
      temperature: 0.7,
      maxTokens: 1000,
      abortSignal
    })

    mainLogger.info(`AI response streaming started with ${currentProvider}`)

    for await (const chunk of result.textStream) {
      // Check if aborted during streaming
      if (abortSignal?.aborted) {
        mainLogger.info(`🚫 Stream aborted during chunk processing - stopping iteration`)
        throw new Error('AbortError')
      }
      yield chunk
    }

    mainLogger.info(`✅ AI response streaming completed successfully with ${currentProvider}`)
  } catch (error) {
    if (error instanceof Error && (error.message === 'AbortError' || error.name === 'AbortError')) {
      mainLogger.info(`🚫 AI stream was aborted for ${currentProvider}`)
    } else {
      mainLogger.error('AI chat error:', error)
    }
    throw error
  }
}

export async function getAvailableModels(provider: AIProvider): Promise<string[]> {
  return MODEL_CONFIG[provider]?.available || []
}

export async function testConnection(provider: AIProvider): Promise<boolean> {
  try {
    const model = await createModel(provider)
    const result = await streamText({
      model,
      messages: [{ role: 'user', content: 'Test' }],
      maxTokens: 5
    })

    for await (const chunk of result.textStream) {
      if (chunk?.length > 0) {
        mainLogger.info(`Connection test successful for ${provider}`)
        return true
      }
    }
    return false
  } catch (error) {
    mainLogger.error(`Connection test failed for ${provider}:`, error)
    return false
  }
}
