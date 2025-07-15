import { app } from 'electron'
import log from 'electron-log/main'
import path from 'path'

const isDev = process.env.NODE_ENV === 'development'

function getLogFolder(): string {
  if (isDev) {
    if (!import.meta.env.MAIN_VITE_USER_DATA_PATH) {
      throw new Error('MAIN_VITE_USER_DATA_PATH environment variable is required in development')
    }
    return path.join(import.meta.env.MAIN_VITE_USER_DATA_PATH, 'logs')
  }
  return path.join(app.getPath('userData'), 'logs')
}

export function initializeLogging(): void {
  const logFolder = getLogFolder()

  // Initialize for renderer IPC
  log.initialize()

  // Use default console format that includes scope display

  // Configure file transport to route to separate files based on scope
  log.transports.file.resolvePathFn = (_variables, message) => {
    const scope = message?.scope || 'main'
    // Route each scope to its own log file
    const fileName = `${scope}.log`
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

  log.info(`📝 Logging initialized - Files: main.log, renderer.log, preload.log in ${path.resolve(logFolder)}`)
}

// Create scoped logger for main process
export const mainLogger = log.scope('main')
export default log
