import { Server } from './server'
import { initializeBackendLogging, backendLogger } from './logger'
import { getDatabase, runMigrations, testDatabaseConnection } from './db'

// Initialize logging first
initializeBackendLogging()

backendLogger.info('🚀 Backend process started')

function initializeDatabase(): void {
  try {
    // Initialize Drizzle database connection
    getDatabase()

    // Run database migrations
    runMigrations()

    testDatabaseConnection()

    backendLogger.info('✅ Database ready')
  } catch (error) {
    backendLogger.error('❌ Failed to initialize database:', error)

    // Exit the backend process if database initialization fails
    process.exit(1)
  }
}

function main(): void {
  // Initialize database
  initializeDatabase()

  const server = new Server(process.parentPort)

  process.parentPort.on('message', (e) => {
    if (!e.data.channel && e.data.message) throw new Error('Malformatted message')

    if (e.data.channel === 'connect-renderer') {
      const [port] = e.ports
      server.connectRenderer(port)
      process.parentPort.postMessage({
        data: { channel: 'renderer-connected', message: e.data.message }
      })
    }
  })
}

main()
