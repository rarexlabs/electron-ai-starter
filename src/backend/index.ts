import log from 'electron-log'
import { Server } from './server'

const logger = log.scope('backend')
logger.info('🚀 Backend process started')

function main(): void {
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
