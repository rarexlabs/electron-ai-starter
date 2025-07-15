import { ipcMain, BrowserWindow, shell } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'
import icon from '@resources/icon.png?asset'
import { Handler } from './handler'
import { Backend } from './backend'
import { mainLogger } from './logger'

export class Server {
  private _backend: Backend
  private _mainWindow: BrowserWindow | null = null
  private _handler: Handler

  constructor() {
    this._handler = new Handler()
    this._backend = new Backend()
    this.setupHandlers()
  }

  private setupHandlers(): void {
    ipcMain.handle('ping', async () => {
      return await this._handler.ping()
    })

    ipcMain.handle('openFolder', async (_, folderPath: string) => {
      return await this._handler.openFolder(folderPath)
    })

    // Backend connection handler
    ipcMain.on('connectBackend', async (e) => {
      return this._backend.connect(e.sender)
    })
  }

  async createWindow(): Promise<void> {
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
      mainLogger.info('Main window closed')
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

    mainLogger.info('Main window created')
  }

  getMainWindow(): BrowserWindow | null {
    return this._mainWindow
  }

  getBackend(): Backend {
    return this._backend
  }

  async shutdown(): Promise<void> {
    mainLogger.info('🛑 Shutting down server...')
    
    // Close main window
    if (this._mainWindow && !this._mainWindow.isDestroyed()) {
      this._mainWindow.close()
    }

    // Stop backend
    await this._backend.stop()
    
    mainLogger.info('✅ Server shutdown complete')
  }
}