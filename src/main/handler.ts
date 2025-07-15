import { shell } from 'electron'
import type { Result } from '@common/types'
import { ok } from '@common/result'

export class Handler {
  async ping(): Promise<Result<string>> {
    return ok('pong')
  }

  async openFolder(folderPath: string): Promise<Result<void>> {
    await shell.openPath(folderPath)
    return ok(undefined)
  }
}
