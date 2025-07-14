import { utilityProcess, MessageChannelMain, UtilityProcess, MessagePortMain } from 'electron'
import { mainLogger } from './logger'
import backendPath from '../backend/index?modulePath'

export class BackendManager {
  private backendProcess: UtilityProcess | null = null
  private messageChannel: MessageChannelMain | null = null
  private isStarted = false

  async startBackend(): Promise<MessagePortMain> {
    if (this.isStarted) {
      mainLogger.warn('⚠️ Backend already started')
      return this.messageChannel!.port2
    }

    try {
      mainLogger.info('🚀 Starting backend process...')

      // Create MessageChannel for communication
      this.messageChannel = new MessageChannelMain()

      // Spawn backend process using ?modulePath
      this.backendProcess = utilityProcess.fork(backendPath)

      // Send port1 to backend process
      this.backendProcess.postMessage({ message: 'init' }, [this.messageChannel.port1])

      // Handle backend process events
      this.backendProcess.on('spawn', () => {
        mainLogger.info('✅ Backend process spawned successfully')
      })

      this.backendProcess.on('exit', (code) => {
        mainLogger.warn(`⚠️ Backend process exited with code: ${code}`)
        this.isStarted = false
      })

      this.backendProcess.on('message', (message) => {
        mainLogger.info('📨 Message from backend:', message)
      })

      this.isStarted = true
      mainLogger.info('✅ Backend manager started, returning port2 for preload')

      // Return port2 for preload script
      return this.messageChannel.port2
    } catch (error) {
      mainLogger.error('❌ Failed to start backend process:', error)
      throw error
    }
  }

  async stopBackend(): Promise<void> {
    if (this.backendProcess) {
      mainLogger.info('🛑 Stopping backend process...')

      return new Promise<void>((resolve) => {
        if (!this.backendProcess) {
          resolve()
          return
        }

        // Set up timeout for force kill
        const forceKillTimeout = setTimeout(() => {
          if (this.backendProcess) {
            mainLogger.warn('⚠️ Force killing backend process after timeout')
            this.backendProcess.kill('SIGKILL')
          }
        }, 3000) // 3 second timeout

        // Listen for process exit
        this.backendProcess.once('exit', () => {
          clearTimeout(forceKillTimeout)
          this.backendProcess = null
          this.messageChannel = null
          this.isStarted = false
          mainLogger.info('✅ Backend process stopped')
          resolve()
        })

        // Try graceful shutdown first
        this.backendProcess.kill('SIGTERM')

        // If still running after 1 second, try SIGINT
        setTimeout(() => {
          if (this.backendProcess) {
            mainLogger.info('🔄 Sending SIGINT to backend process')
            this.backendProcess.kill('SIGINT')
          }
        }, 1000)
      })
    }
  }

  isBackendRunning(): boolean {
    return this.isStarted && this.backendProcess !== null
  }
}

// Export singleton instance
export const backendManager = new BackendManager()
