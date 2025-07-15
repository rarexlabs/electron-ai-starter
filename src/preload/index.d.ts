import { ElectronAPI } from '@electron-toolkit/preload'
import { BackendListenerAPI, RendererBackendAPI } from '../common/types'

export type { AIProvider, AIMessage, AISettings, AIConfig } from '../common/types'

declare global {
  // Global electron-log object
  const __electronLog: {
    error: (...args: unknown[]) => void
    warn: (...args: unknown[]) => void
    info: (...args: unknown[]) => void
    verbose: (...args: unknown[]) => void
    debug: (...args: unknown[]) => void
    silly: (...args: unknown[]) => void
  }

  interface Window {
    electron: ElectronAPI
    connectBackend(): Promise<void>
    main: {
      // Only keep essential main process operations
      openFolder(folderPath: string): Promise<void>
      // Raw IPC event methods for renderer to handle streaming events
      on(channel: string, listener: (...args: unknown[]) => void): void
      off(channel: string, listener: (...args: unknown[]) => void): void
    }
    backend: BackendListenerAPI & RendererBackendAPI
  }
}
