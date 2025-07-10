import { ElectronAPI } from '@electron-toolkit/preload'

export type { AIProvider, AIMessage, AISettings } from '../types/ai'

declare global {
  interface Window {
    electron: ElectronAPI
    api: unknown
    database: {
      getSetting(key: string): Promise<unknown>
      setSetting(key: string, value: unknown): Promise<void>
      getAllSettings(): Promise<Record<string, unknown>>
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
