import { Server } from './server'
import logger, { initializeBackendLogging } from './logger'
import { runMigrations, testConnection, db } from './db'

// Initialize logging first
initializeBackendLogging()

logger.info('🚀 Backend process started')

async function initializeDatabase(): Promise<void> {
  await runMigrations(db)
  await testConnection(db)
  logger.info('✅ Database ready')
}

async function main(): Promise<void> {
  // Initialize database
  await initializeDatabase()

  const server = new Server(process.parentPort)

  process.parentPort.on('message', (e) => {
    if (!e.data.channel && e.data.message) throw new Error('Malformatted message')

    if (e.data.channel === 'connectRenderer') {
      const [port] = e.ports
      server.connectRenderer(port)
      process.parentPort.postMessage({
        data: { channel: 'rendererConnected', message: e.data.message }
      })
    }
  })
}

main()
