import { app } from 'electron'
import log from 'electron-log/main'
import path from 'path'
import fs from 'fs'

const isDev = process.env.NODE_ENV === 'development'

function getLogFolder(): string {
  if (isDev) {
    return process.env.LOG_FOLDER || './tmp/logs'
  }
  return path.join(app.getPath('userData'), 'logs')
}

export function initializeLogging(): void {
  const logFolder = getLogFolder()
  
  // Ensure log folder exists
  if (!fs.existsSync(logFolder)) {
    fs.mkdirSync(logFolder, { recursive: true })
  }

  // Initialize for renderer IPC
  log.initialize()

  // Configure console format using built-in template
  log.transports.console.format = '{h}:{i}:{s}.{ms} [{processLabel}] [{level}] {text}'

  // Configure file transport to route to separate files using built-in resolvePathFn
  log.transports.file.resolvePathFn = (variables, message) => {
    const processType = message?.variables?.processType || 'main'
    const fileName = processType === 'renderer' ? 'renderer.log' : 'main.log'
    return path.join(logFolder, fileName)
  }

  // Add custom variable for process label
  log.variables.processLabel = 'm'  // default to main

  // Hook to set process label dynamically
  log.hooks.push((message) => {
    message.variables = message.variables || {}
    message.variables.processLabel = message.variables.processType === 'renderer' ? 'r' : 'm'
    return message
  })

  // Set log levels and other file transport options
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

  log.info('Logging initialized', {
    logFolder,
    isDev,
    mainLogPath: path.join(logFolder, 'main.log'),
    rendererLogPath: path.join(logFolder, 'renderer.log')
  })
}

export const mainLogger = log
export default log