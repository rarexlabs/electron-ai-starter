import { ipcRenderer } from 'electron'

interface LoggerMessage {
  data: unknown[]
  level: string
  scope: string
  variables: { processType: string }
}

interface PreloadLogger {
  info: (message: string, ...args: unknown[]) => void
  warn: (message: string, ...args: unknown[]) => void
  error: (message: string, ...args: unknown[]) => void
  debug: (message: string, ...args: unknown[]) => void
}

function sendLogMessage(level: string, message: string, ...args: unknown[]): void {
  const logMessage: LoggerMessage = {
    data: [message, ...args],
    level,
    scope: 'preload',
    variables: { processType: 'preload' }
  }
  ipcRenderer.send('__ELECTRON_LOG__', logMessage)
}

// Create scoped logger for preload process using direct IPC
export const preloadLogger: PreloadLogger = {
  info: (message: string, ...args: unknown[]) => {
    sendLogMessage('info', message, ...args)
  },
  warn: (message: string, ...args: unknown[]) => {
    sendLogMessage('warn', message, ...args)
  },
  error: (message: string, ...args: unknown[]) => {
    sendLogMessage('error', message, ...args)
  },
  debug: (message: string, ...args: unknown[]) => {
    sendLogMessage('debug', message, ...args)
  }
}

export default preloadLogger