import { app } from 'electron'
import log from 'electron-log/main'
import path from 'path'

const isDev = process.env.NODE_ENV === 'development'

function getLogFolder(): string {
  if (isDev) {
    return process.env.LOG_FOLDER || './tmp/logs'
  }
  return path.join(app.getPath('userData'), 'logs')
}

export function initializeLogging(): void {
  const logFolder = getLogFolder()

  // Initialize for renderer IPC
  log.initialize()

  // Configure console format with process type
  log.transports.console.format = '{h}:{i}:{s}.{ms} [{processType}] [{level}] {text}'

  // Configure file transport to route to separate files
  log.transports.file.resolvePathFn = (_variables, message) => {
    const processType = message?.variables?.processType || 'main'
    const fileName = processType === 'renderer' ? 'renderer.log' : 'main.log'
    return path.join(logFolder, fileName)
  }

  // Set log levels and file transport options
  log.transports.console.level = isDev ? 'debug' : 'error'
  log.transports.file.level = isDev ? 'debug' : 'info'
  log.transports.file.maxSize = 5 * 1024 * 1024 // 5MB

  // Error and event handling
  log.errorHandler.startCatching({
    showDialog: isDev,
    onError: ({ error, processType }) => {
      log.error('Process error:', { processType, error })
    }
  })

  log.eventLogger.startLogging({ level: 'warn' })

  log.info(`📝 Logging initialized - ${path.resolve(logFolder)}`)
}

export const mainLogger = log
export default log