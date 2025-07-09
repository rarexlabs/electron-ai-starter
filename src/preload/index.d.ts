import { ElectronAPI } from '@electron-toolkit/preload'

export type AIProvider = 'openai' | 'anthropic' | 'google'

export interface AIMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: unknown
    database: {
      getSetting(namespace: string, key: string): Promise<string | null>
      setSetting(namespace: string, key: string, value: string): Promise<void>
      getSettingsByNamespace(namespace: string): Promise<Record<string, string>>
      clearDatabase(): Promise<void>
      getDatabasePath(): Promise<string>
      getLogPath(): Promise<string>
      openFolder(folderPath: string): Promise<void>
    }
    ai: {
      streamChat(
        messages: AIMessage[],
        provider?: AIProvider,
        onChunk?: (chunk: string) => void,
        onEnd?: () => void,
        onError?: (error: string) => void
      ): Promise<string>
      getModels(provider: AIProvider): Promise<string[]>
      testConnection(provider: AIProvider): Promise<boolean>
    }
  }
}
