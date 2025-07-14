import log from 'electron-log'
import { Server } from './server'

const logger = log.scope('backend')
logger.info('🚀 Backend process started')

function main(): void {
  const server = new Server()

  process.parentPort.on('message', (e) => {
    console.log(e.data)
    if (!e.data.channel && e.data.message) throw new Error('Malformatted message')

    if (e.data.message === 'connect-renderer') {
      const [port] = e.ports
      server.connectRenderer(port)
      process.parentPort.postMessage({
        data: { channel: e.data.channel, message: 'renderer-connected' }
      })
    }
  })
}

main()
