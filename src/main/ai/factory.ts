import { createOpenAI } from '@ai-sdk/openai'
import { createAnthropic } from '@ai-sdk/anthropic'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { getSetting } from '../settings'
import type { AIProvider } from '../../types/ai'
import type { LanguageModelV1 } from 'ai'

export const FACTORY = {
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

export async function listAvailableModel(provider: AIProvider): Promise<string[]> {
  return FACTORY[provider]?.available || []
}

export async function createModel(provider: AIProvider): Promise<LanguageModelV1> {
  const aiSettings = (await getSetting('ai')) || {}
  const apiKey = aiSettings[`${provider}_api_key`]
  const model = aiSettings[`${provider}_model`]

  if (!apiKey) {
    throw new Error(`API key not found for ${provider}`)
  }

  const config = FACTORY[provider]
  return config.createModel(apiKey, model || config.default)
}
