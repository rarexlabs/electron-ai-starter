import log from 'electron-log'
import { Connection } from '../common/connection'

const logger = log.scope('backend')

logger.info('🚀 Backend process starting...')

let connection: Connection | null = null

// Listen for MessagePort from main process
process.parentPort.on('message', (e) => {
  logger.info('📨 Received message from main process')
  const [port] = e.ports

  if (!port) {
    logger.error('❌ No MessagePort received')
    return
  }

  // Create connection with the MessagePortMain directly
  connection = new Connection(port)

  // Handle ping requests
  connection.handle('ping', async () => {
    logger.info('📧 Received ping from preload')
    return { status: 'success', data: 'pong' }
  })

  // Handle test requests
  connection.handle('test', async (...args) => {
    const message = args[0] as string
    logger.info('📧 Received test message from preload:', message)
    return { status: 'success', data: `Echo: ${message}` }
  })

  // Handle error test requests
  connection.handle('error-test', async () => {
    logger.info('📧 Received error-test from preload')
    return { status: 'error', error: new Error('Test error from backend') }
  })

  // Example of listening for events
  connection.onEvent('custom-event', (payload) => {
    logger.info('📧 Received custom event from preload:', payload)

    // Echo the event back to preload
    connection!.publishEvent('echo-event', `Echo: ${payload}`)
  })

  logger.info('✅ Backend connection established')
})

// Log connection status
setInterval(() => {
  if (connection?.isConnected()) {
    logger.debug('💓 Backend connection healthy')
  } else {
    logger.warn('⚠️ Backend connection not ready')
  }
}, 30000) // Check every 30 seconds

// Handle process cleanup
process.on('SIGTERM', () => {
  logger.info('🛑 Backend process received SIGTERM, cleaning up...')
  connection?.close()
  process.exit(0)
})

process.on('SIGINT', () => {
  logger.info('🛑 Backend process received SIGINT, cleaning up...')
  connection?.close()
  process.exit(0)
})

logger.info('✅ Backend process initialized with Connection pattern')
