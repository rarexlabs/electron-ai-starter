import log from 'electron-log'

const logger = log.scope('backend')

logger.info('🚀 Backend process starting...')

process.parentPort.on('message', (e) => {
  logger.info('📨 Received message from main process')
  const [port] = e.ports

  if (!port) {
    logger.error('❌ No MessagePort received')
    return
  }

  port.on('message', (e) => {
    logger.info('📧 Received message from renderer:', e.data)

    if (e.data === 'ping') {
      port.postMessage('pong')
      logger.info('📤 Sent pong response to renderer')
    }
  })

  port.start()
  logger.info('✅ Backend MessagePort communication ready')
})

logger.info('✅ Backend process initialized')
