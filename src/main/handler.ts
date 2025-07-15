import { shell } from 'electron'
import type { Result } from '@common/types'
import { ok } from '@common/result'
import { mainLogger } from './logger'

export class Handler {
  constructor() {}

  async ping(): Promise<Result<string>> {
    mainLogger.info('pong')
    return ok('pong')
  }

  async openFolder(folderPath: string): Promise<Result<void>> {
    try {
      await shell.openPath(folderPath)
      mainLogger.info(`Opened folder: ${folderPath}`)
      return ok(undefined)
    } catch (error) {
      mainLogger.error('Failed to open folder:', error)
      throw error
    }
  }
}
