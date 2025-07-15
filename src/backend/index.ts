import { Server } from './server'
import logger, { initializeBackendLogging } from './logger'
import { getDatabase, runMigrations, testDatabaseConnection } from './db'

// Initialize logging first
initializeBackendLogging()

logger.info('🚀 Backend process started')

async function initializeDatabase(): Promise<void> {
  try {
    // Initialize Drizzle database connection
    getDatabase()

    // Run database migrations
    await runMigrations()

    await testDatabaseConnection()

    logger.info('✅ Database ready')
  } catch (error) {
    logger.error('❌ Failed to initialize database:', error)

    // Exit the backend process if database initialization fails
    process.exit(1)
  }
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
