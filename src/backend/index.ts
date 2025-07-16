import { Server } from './server'
import logger from './logger'

async function main(): Promise<void> {
  logger.info('Backend process started')
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

  await server.init()
}

main()
