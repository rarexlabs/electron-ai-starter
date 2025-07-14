import { app, shell, BrowserWindow, dialog } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '@resources/icon.png?asset'
import { getDatabase, closeDatabase, runMigrations, testDatabaseConnection } from './db'
import { initializeLogging, mainLogger } from './logger'
import { setupIpcHandlers } from './ipc-handlers'
import { backendManager } from './backend-manager'

initializeLogging()

mainLogger.info('🚀 App starting...')
mainLogger.info('🔧 Main process started')

function initializeDatabase(): void {
  try {
    // Initialize Drizzle database connection
    getDatabase()

    // Run database migrations
    runMigrations()

    testDatabaseConnection()

    mainLogger.info('✅ Database ready')
  } catch (error) {
    mainLogger.error('❌ Failed to initialize database:', error)

    // Attempt to show user-friendly error dialog
    dialog.showErrorBox(
      'Database Error',
      `Failed to initialize database: ${error instanceof Error ? error.message : String(error)}`
    )

    // Exit the application if database initialization fails
    app.quit()
  }
}

async function createWindow(): Promise<void> {
  const mainWindow = new BrowserWindow({
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

  // Start backend process and get MessagePort
  try {
    const backendPort = await backendManager.startBackend()

    // Pass the MessagePort to the preload script
    mainWindow.webContents.once('did-finish-load', () => {
      mainWindow.webContents.postMessage('backend-port', null, [backendPort])
      mainLogger.info('📤 Sent backend MessagePort to renderer')
    })
  } catch (error) {
    mainLogger.error('❌ Failed to setup backend communication:', error)
  }

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.worthyfiles')

  // Logging already initialized at module load

  // Initialize database
  initializeDatabase()

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // Setup IPC handlers
  setupIpcHandlers()

  createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    closeDatabase()
    app.quit()
  }
})

async function shutdownGracefully(): Promise<void> {
  try {
    await backendManager.stopBackend()
    closeDatabase()
    mainLogger.info('✅ Graceful shutdown complete')
  } catch (error) {
    mainLogger.error('❌ Error during graceful shutdown:', error)
  }
}

// Close database and stop backend on app quit
app.on('before-quit', async (event) => {
  event.preventDefault()
  await shutdownGracefully()
  app.exit(0)
})
