import { ipcMain, BrowserWindow, shell } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'
import icon from '@resources/icon.png?asset'
import { Handler } from './handler'
import { Backend } from './backend'
import logger from './logger'

export class Server {
  private _backend: Backend
  private _mainWindow: BrowserWindow | null = null
  private _handler: Handler

  constructor() {
    this._handler = new Handler()
    this._backend = new Backend()

    ipcMain.on('connectBackend', async (e) => {
      return this._backend.connectRenderer(e.sender)
    })

    this._handle(['ping', 'openFolder'])
  }

  async createMainWindow(): Promise<void> {
    this._mainWindow = new BrowserWindow({
      width: 900,
      height: 670,
      show: false,
      autoHideMenuBar: true,
      title: 'Electron AI Starter',
      ...(process.platform === 'linux' ? { icon } : {}),
      webPreferences: {
        preload: join(__dirname, '../preload/index.js'),
        sandbox: false
      }
    })

    this._mainWindow.on('ready-to-show', () => {
      this._mainWindow!.show()
    })

    this._mainWindow.on('closed', () => {
      this._mainWindow = null
      logger.info('Main window closed')
    })

    this._mainWindow.webContents.setWindowOpenHandler((details) => {
      shell.openExternal(details.url)
      return { action: 'deny' }
    })

    // HMR for renderer base on electron-vite cli.
    // Load the remote URL for development or the local html file for production.
    if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
      this._mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
    } else {
      this._mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
    }

    logger.info('Main window created')
  }

  async shutdown(): Promise<void> {
    await this._backend.stop()
  }

  private _handle(channels: string[]) {
    for (const channel of channels) {
      ipcMain.handle(channel, async (_e, ...args) => {
        return this._handleChannel(this._handler, channel, args)
      })
    }
  }

  private async _handleChannel(handler: Handler, channel: string, args: unknown[]) {
    const channelHandler = handler[channel]

    logger.info('[start]', `Handler#${channel}`)
    const result = await channelHandler.apply(handler, args)
    logger.info('[end]', `Handler#${channel}`)

    return result
  }
}
