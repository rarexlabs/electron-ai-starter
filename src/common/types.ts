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

export class TimeoutError extends Error {
  limitMs: number

  constructor({ limitMs }: { limitMs: number }) {
    super(`Operation timed out after ${limitMs}ms`)
    this.name = 'TimeoutError'
    this.limitMs = limitMs
  }
}

export type Result<A, E = never> = Ok<A> | Error<E | TimeoutError>

export interface Ok<A> {
  status: 'ok'
  value: A
}

export interface Error<E> {
  status: 'error'
  error: E
}

export interface InvokeMessage {
  id: string
  type: 'invoke'
  channel: string
  args: unknown[]
}

export interface ResultMessage {
  id: string
  type: 'result'
  channel: string
  payload: Result<unknown, unknown>
}

export interface EventMessage {
  type: 'event'
  channel: string
  payload: unknown
}

export type ConnectionMessage = InvokeMessage | ResultMessage | EventMessage

export enum EventType {
  Message = 'message',
  Status = 'status',
  Error = 'error'
}

export interface AppEvent {
  type: EventType
  payload: unknown
}

export interface BackendMainAPI {
  osEncrypt: (text: string) => Promise<Result<string, string>>
  osDecrypt: (text: string) => Promise<Result<string, string>>
}

export interface BackendListenerAPI {
  onEvent: (channel: string, callback: (appEvent: AppEvent) => void) => void
  offEvent: (channel: string) => void
}

export interface RendererBackendAPI {
  ping: () => Promise<Result<string>>
  getSetting: (key: string) => Promise<Result<unknown>>
  setSetting: (key: string, value: unknown) => Promise<Result<void>>
  clearSetting: (key: string) => Promise<Result<void>>
  clearDatabase: () => Promise<Result<void>>
  getDatabasePath: () => Promise<Result<string>>
  getLogPath: () => Promise<Result<string>>
  streamAIChat: (messages: AIMessage[]) => Promise<Result<string>>
  abortAIChat: (sessionId: string) => Promise<Result<void>>
  getAIModels: (provider: AIProvider) => Promise<Result<string[]>>
  testAIProviderConnection: (config: AIConfig) => Promise<Result<boolean>>
}
