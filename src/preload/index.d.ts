import { ElectronAPI } from '@electron-toolkit/preload'

export type { AIProvider, AIMessage, AISettings, AIConfig } from '../common/types'

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
      streamAIChat(messages: AIMessage[]): Promise<string>
      abortAIChat(sessionId: string): Promise<void>
      getAIModels(provider: AIProvider): Promise<string[]>
      testAIProviderConnection(config: AIConfig): Promise<boolean>
      // Raw IPC event methods for renderer to handle streaming events
      on(channel: string, listener: (...args: unknown[]) => void): void
      off(channel: string, listener: (...args: unknown[]) => void): void
    }
  }
}
