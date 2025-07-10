import { createOpenAI } from '@ai-sdk/openai'
import { createAnthropic } from '@ai-sdk/anthropic'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { streamText, type LanguageModelV1 } from 'ai'
import { getSetting } from '../settings'
import { mainLogger } from '../logger'
import type { AIProvider } from '../../types/ai'

export const MODEL_CONFIG = {
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

export async function createModel(provider: AIProvider): Promise<LanguageModelV1> {
  const aiSettings = (await getSetting('ai')) || {}
  const apiKey = aiSettings[`${provider}_api_key`]
  const model = aiSettings[`${provider}_model`]

  if (!apiKey) {
    throw new Error(`API key not found for ${provider}`)
  }

  const config = MODEL_CONFIG[provider]
  return config.createModel(apiKey, model || config.default)
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
