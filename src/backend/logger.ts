import log from 'electron-log'
import path from 'path'
import { getUserDataPath } from './user-data-path'

const isDev = process.env.NODE_ENV === 'development'

function getLogFolder(): string {
  const userDataPath = getUserDataPath()
  return path.join(userDataPath, 'logs')
}

function initLogger(): void {
  const logFolder = getLogFolder()

  // Configure file transport to route to backend.log
  log.transports.file.resolvePathFn = () => {
    return path.join(logFolder, 'backend.log')
  }

  // Set log levels and file transport options to match main process
  log.transports.console.level = isDev ? 'debug' : 'error'
  log.transports.file.level = isDev ? 'debug' : 'info'
  log.transports.file.maxSize = 5 * 1024 * 1024 // 5MB

  // Error handling
  log.errorHandler.startCatching({
    showDialog: false, // No dialogs in backend process
    onError: ({ error, processType }) => {
      log.error('Backend process error:', { processType, error })
    }
  })
}

initLogger()
export const logger = log.scope('backend')
export default logger
