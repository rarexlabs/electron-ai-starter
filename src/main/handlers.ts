import { ipcMain, shell } from 'electron'
import { mainLogger } from './logger'

export function setupHandlers(): void {
  // Only keep essential main process operations
  ipcMain.handle('openFolder', async (_, folderPath: string) => {
    try {
      await shell.openPath(folderPath)
      mainLogger.info(`Opened folder: ${folderPath}`)
    } catch (error) {
      mainLogger.error('Failed to open folder:', error)
      throw error
    }
  })

  ipcMain.on('ping', () => mainLogger.info('pong'))
}
