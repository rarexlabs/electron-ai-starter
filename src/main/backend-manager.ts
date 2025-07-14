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
      this.backendProcess.kill()
      this.backendProcess = null
      this.messageChannel = null
      this.isStarted = false
      mainLogger.info('✅ Backend process stopped')
    }
  }

  isBackendRunning(): boolean {
    return this.isStarted && this.backendProcess !== null
  }
}

// Export singleton instance
export const backendManager = new BackendManager()
