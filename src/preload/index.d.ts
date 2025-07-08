import { ElectronAPI } from '@electron-toolkit/preload'

declare global {
  interface Window {
    electron: ElectronAPI
    api: unknown
    database: {
      getSetting(namespace: string, key: string): Promise<string | null>
      setSetting(namespace: string, key: string, value: string): Promise<void>
      getSettingsByNamespace(namespace: string): Promise<Record<string, string>>
      clearDatabase(): Promise<void>
    }
  }
}
