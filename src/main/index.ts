import { app, shell, BrowserWindow, ipcMain, dialog } from 'electron'
import { join, dirname, resolve } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { getDatabase, closeDatabase, runMigrations, testDatabaseConnection } from './db/connection'
import {
  getSetting,
  setSetting,
  getSettingsByNamespace,
  clearDatabase
} from './db/services/settings'
import { initializeLogging, mainLogger } from './lib/logger'

// Initialize logging immediately
initializeLogging()

// Log app startup as early as possible
mainLogger.info('🚀 App starting...')
mainLogger.info('🔧 Main process started')

// Helper functions for path management
function getBasePath(): string {
  const isDev = process.env.NODE_ENV === 'development' || import.meta.env.DEV
  const configPath = process.env.DB_PATH || import.meta.env.MAIN_VITE_USER_DATA_PATH

  if (!configPath) {
    if (isDev) {
      throw new Error('Database path is required in development.')
    }
    return app.getPath('userData')
  }

  return configPath
}

function getDatabasePath(): string {
  return resolve(join(getBasePath(), 'db', 'app.db'))
}

function getLogPath(): string {
  return resolve(join(getBasePath(), 'logs'))
}

function initializeDatabase(): void {
  try {
    // Initialize Drizzle database connection
    getDatabase()

    // Run database migrations
    runMigrations()

    // Test the connection
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

function createWindow(): void {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    autoHideMenuBar: true,
    title: 'WorthyFiles',
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

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

  // Database IPC handlers
  ipcMain.handle('get-setting', async (_, namespace: string, key: string) => {
    return getSetting(namespace, key)
  })

  ipcMain.handle('set-setting', async (_, namespace: string, key: string, value: string) => {
    return setSetting(namespace, key, value)
  })

  ipcMain.handle('get-settings-by-namespace', async (_, namespace: string) => {
    return getSettingsByNamespace(namespace)
  })

  ipcMain.handle('clear-database', async () => {
    return clearDatabase()
  })

  // Path IPC handlers
  ipcMain.handle('get-database-path', async () => {
    try {
      const dbPath = getDatabasePath()
      return resolve(dirname(dbPath)) // Return the absolute path to the folder containing the database file
    } catch (error) {
      mainLogger.error('Failed to get database path:', error)
      throw error
    }
  })

  ipcMain.handle('get-log-path', async () => {
    try {
      return getLogPath()
    } catch (error) {
      mainLogger.error('Failed to get log path:', error)
      throw error
    }
  })

  ipcMain.handle('open-folder', async (_, folderPath: string) => {
    try {
      await shell.openPath(folderPath)
      mainLogger.info(`Opened folder: ${folderPath}`)
    } catch (error) {
      mainLogger.error('Failed to open folder:', error)
      throw error
    }
  })

  // IPC test
  ipcMain.on('ping', () => mainLogger.info('pong'))

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

// Close database on app quit
app.on('before-quit', () => {
  closeDatabase()
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
