export type AIProvider = 'openai' | 'anthropic' | 'google'

export interface AIMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

export interface AIConfig {
  provider: AIProvider
  model: string
  apiKey: string
}

export interface AISettings {
  default_provider?: AIProvider
  openai_api_key?: string
  openai_model?: string
  anthropic_api_key?: string
  anthropic_model?: string
  google_api_key?: string
  google_model?: string
}

export interface AIStreamSession {
  id: string
  provider: AIProvider
  messages: AIMessage[]
  abortController: AbortController
  createdAt: Date
}
