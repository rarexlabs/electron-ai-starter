import log from 'electron-log'
import path from 'path'

const isDev = process.env.NODE_ENV === 'development'

function parseUserDataPath(): string {
  const args = process.argv
  const userDataPathIndex = args.indexOf('--user-data-path')

  if (userDataPathIndex === -1 || userDataPathIndex + 1 >= args.length) {
    throw new Error('user-data-path argument is required but not provided by main process')
  }

  return args[userDataPathIndex + 1]
}

function getLogFolder(): string {
  const userDataPath = parseUserDataPath()
  return path.join(userDataPath, 'logs')
}

export function initializeBackendLogging(): void {
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

  log.info(`📝 Backend logging initialized - File: backend.log in ${path.resolve(logFolder)}`)
}

// Create scoped logger for backend process
const logger = log.scope('backend')
export default logger
