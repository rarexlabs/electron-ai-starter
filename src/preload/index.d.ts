import { ElectronAPI } from '@electron-toolkit/preload'

export type { AIProvider, AIMessage, AISettings } from '../types/ai'

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      // Settings operations
      getSetting(key: string): Promise<unknown>
      setSetting(key: string, value: unknown): Promise<void>
      getAllSettings(): Promise<Record<string, unknown>>
      clearSetting(key: string): Promise<void>
      clearDatabase(): Promise<void>
      getDatabasePath(): Promise<string>
      getLogPath(): Promise<string>
      openFolder(folderPath: string): Promise<void>
      // AI operations
      streamAIChat(
        messages: AIMessage[],
        provider?: AIProvider,
        onChunk?: (chunk: string) => void,
        onEnd?: () => void,
        onError?: (error: string) => void,
        onSessionId?: (sessionId: string) => void
      ): Promise<string>
      abortAIChat(sessionId: string): Promise<void>
      getAIModels(provider: AIProvider): Promise<string[]>
      testAIProviderConnection(provider: AIProvider): Promise<boolean>
    }
  }
}
