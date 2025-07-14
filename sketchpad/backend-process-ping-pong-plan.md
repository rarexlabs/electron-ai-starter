# Backend Process Ping-Pong Implementation Plan

## Overview

Implement direct renderer ↔ backend process communication using MessageChannels with proper logging. Add backend ping functionality to the existing preload API, keeping the implementation minimal and consistent with current patterns.

## Architecture Design

### File Structure

```
src/
├── main/
│   ├── index.ts (modify: add backend process spawning)
│   └── backend-manager.ts (new: manages backend process lifecycle)
├── preload/
│   └── index.ts (modify: add backend ping to existing API)
└── backend/ (new directory)
    └── index.ts (new: backend process entry point)
```

### Key Principles

- **No UI Changes**: Keep existing App.tsx unchanged
- **No Backend Client**: Use existing preload API pattern
- **Consistent API**: Add to existing `window.api` object
- **Leverage ?modulePath**: Use electron-vite's built-in utility process support

### Communication Flow

1. **Main Process**: Creates MessageChannelMain, spawns backend with port1 using `?modulePath`
2. **Backend Process**: Receives port1, sets up Node.js style listeners
3. **Preload Script**: Receives port2, bridges to renderer with web API
4. **Renderer**: Uses clean API to send ping, receive pong

## Implementation Tasks

### 1. Create Backend Process

- **File**: `src/backend/index.ts`
- **Purpose**: Backend service that handles ping-pong communication
- **Key Features**:
  - Use Node.js MessagePort API (`port.on('message')`, `port.start()`)
  - Proper logging with backend process logger
  - Handle process cleanup and shutdown gracefully
  - Respond to ping messages with pong

```typescript
// src/backend/index.ts
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
```

### 2. Create Backend Manager

- **File**: `src/main/backend-manager.ts`
- **Purpose**: Manages backend process lifecycle and MessageChannel setup
- **Key Features**:
  - Import backend using `?modulePath`: `import backendPath from '../backend/index?modulePath'`
  - Spawn backend process using `utilityProcess.fork(backendPath)`
  - Create MessageChannelMain and distribute ports
  - Handle process cleanup on app exit
  - Retry logic for process failures
  - Export function to get MessagePort for preload

```typescript
// src/main/backend-manager.ts
import { utilityProcess, MessageChannelMain, UtilityProcess } from 'electron'
import { mainLogger } from './logger'
import backendPath from '../backend/index?modulePath'

export class BackendManager {
  private backendProcess: UtilityProcess | null = null
  private messageChannel: MessageChannelMain | null = null
  private isStarted = false

  async startBackend(): Promise<MessagePort> {
    if (this.isStarted) {
      mainLogger.warn('⚠️ Backend already started')
      return this.messageChannel!.port2
    }

    try {
      mainLogger.info('🚀 Starting backend process...')

      // Create MessageChannel for communication
      this.messageChannel = new MessageChannelMain()

      // Spawn backend process using ?modulePath
      this.backendProcess = utilityProcess.fork(backendPath)

      // Send port1 to backend process
      this.backendProcess.postMessage({ message: 'init' }, [this.messageChannel.port1])

      // Handle backend process events
      this.backendProcess.on('spawn', () => {
        mainLogger.info('✅ Backend process spawned successfully')
      })

      this.backendProcess.on('exit', (code) => {
        mainLogger.warn(`⚠️ Backend process exited with code: ${code}`)
        this.isStarted = false
      })

      this.backendProcess.on('message', (message) => {
        mainLogger.info('📨 Message from backend:', message)
      })

      this.isStarted = true
      mainLogger.info('✅ Backend manager started, returning port2 for preload')

      // Return port2 for preload script
      return this.messageChannel.port2
    } catch (error) {
      mainLogger.error('❌ Failed to start backend process:', error)
      throw error
    }
  }

  async stopBackend(): Promise<void> {
    if (this.backendProcess) {
      mainLogger.info('🛑 Stopping backend process...')
      this.backendProcess.kill()
      this.backendProcess = null
      this.messageChannel = null
      this.isStarted = false
      mainLogger.info('✅ Backend process stopped')
    }
  }

  isBackendRunning(): boolean {
    return this.isStarted && this.backendProcess !== null
  }
}

// Export singleton instance
export const backendManager = new BackendManager()
```

### 3. Update Main Process

- **File**: `src/main/index.ts`
- **Modifications**:
  - Import and initialize backend manager
  - Pass MessagePort to renderer window via preload
  - Handle backend process cleanup on app exit

```typescript
// Add to src/main/index.ts imports
import { backendManager } from './backend-manager'

// Add to createWindow function after window creation:
async function createWindow(): void {
  const mainWindow = new BrowserWindow({
    // ... existing config
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

  // ... rest of existing createWindow code
}

// Add to app quit handlers
app.on('before-quit', async () => {
  await backendManager.stopBackend()
  closeDatabase()
})
```

### 4. Update Preload Script

- **File**: `src/preload/index.ts`
- **Modifications**:
  - Add backend ping functionality to existing API object
  - Handle MessagePort bridging (critical for context isolation)
  - Add setup flag to prevent React StrictMode duplicate setup
  - Store MessagePort reference globally in preload

```typescript
// Add to src/preload/index.ts
import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import log from 'electron-log/preload'

// Backend communication state
let backendPort: MessagePort | null = null
let communicationSetup = false

// Listen for backend MessagePort from main process
ipcRenderer.on('backend-port', (event) => {
  if (communicationSetup) {
    log.warn('⚠️ Backend communication already setup, skipping duplicate')
    return
  }

  const [port] = event.ports
  if (port) {
    backendPort = port
    backendPort.start()
    communicationSetup = true
    log.info('✅ Backend MessagePort received and started')
  } else {
    log.error('❌ No MessagePort received from main process')
  }
})

// Extend existing API object
const API = {
  // ... existing API methods ...

  // Backend process communication
  pingBackend: (): Promise<string> => {
    return new Promise((resolve, reject) => {
      if (!backendPort) {
        reject(new Error('Backend not connected'))
        return
      }

      const timeout = setTimeout(() => {
        reject(new Error('Backend ping timeout'))
      }, 5000)

      const handleResponse = (e: MessageEvent) => {
        if (e.data === 'pong') {
          clearTimeout(timeout)
          backendPort!.removeEventListener('message', handleResponse)
          resolve('pong')
          log.info('✅ Received pong from backend')
        }
      }

      backendPort.addEventListener('message', handleResponse)
      backendPort.postMessage('ping')
      log.info('📤 Sent ping to backend')
    })
  },

  // Check if backend is connected
  isBackendConnected: (): boolean => {
    return backendPort !== null && communicationSetup
  }
}

// ... rest of existing preload code
```

## Technical Implementation Details

### Context Isolation Handling

- **Issue**: MessagePorts don't work directly in renderer with context isolation
- **Solution**: Handle all MessagePort operations in preload script, expose clean API

### API Differences

- **Backend Process**: Node.js style (`port.on('message')`, `port.start()`)
- **Preload/Renderer**: Web style (`port.addEventListener('message')`)

### React StrictMode Protection

- **Issue**: Effects run twice, causing duplicate setup
- **Solution**: Add `communicationSetup` flag to prevent duplicate channels

### Logging Strategy

- **Main Process**: `mainLogger.info('Backend process started')`
- **Backend Process**: `log.scope('backend').info('Received ping')`
- **Preload Script**: `log.info('MessagePort bridging setup')`
- **Renderer**: Can use existing renderer logger

### Usage in Renderer

```typescript
// Any renderer component can now use:
const response = await window.api.pingBackend()
console.log(response) // 'pong'

// Check connection status:
const isConnected = window.api.isBackendConnected()
```

## Testing Strategy

### Manual Testing Steps

1. **Process Startup**: Verify backend process starts on app launch
2. **Connection**: Confirm MessageChannel communication established
3. **API Test**: Call `window.api.pingBackend()` from browser console
4. **Logging**: Verify all processes log their operations
5. **Error Handling**: Test backend process restart scenarios
6. **Performance**: Measure message latency (~1ms expected)
7. **Cleanup**: Verify proper shutdown and resource cleanup

### Console Testing

```javascript
// Test from browser console in renderer
window.api.pingBackend().then((result) => console.log('Backend responded:', result))

// Check connection status
console.log('Backend connected:', window.api.isBackendConnected())
```

### Log Verification

Check logs in `tmp/logs/main.log` and `tmp/logs/renderer.log` for:

- Backend process spawn messages
- MessagePort setup confirmations
- Ping/pong message exchanges
- Error handling and cleanup

## Success Criteria

1. ✅ Backend process spawns successfully using `?modulePath`
2. ✅ MessageChannel communication established properly
3. ✅ `window.api.pingBackend()` returns 'pong'
4. ✅ All operations logged with proper scopes
5. ✅ Clean shutdown and process cleanup
6. ✅ Error handling for backend process failures
7. ✅ No duplicate setups in React StrictMode
8. ✅ No electron-vite config changes needed
9. ✅ Consistent with existing API patterns

## Key Learnings Applied

### From Utility Process Implementation Guide

- **Context Isolation**: MessagePorts handled in preload only
- **API Differences**: Node.js style for backend, web style for renderer
- **React StrictMode**: Setup flag prevents duplicate channels
- **Timing**: Proper readiness checks and retry logic

### From electron-vite Documentation

- **?modulePath**: Automatic compilation and path resolution
- **Utility Process**: Use `utilityProcess.fork()` with MessageChannels
- **Zero Config**: No build configuration changes needed

## Key Advantages

1. **Minimal Changes**: Leverages existing preload API pattern
2. **No UI Changes**: Keeps App.tsx unchanged
3. **Consistent API**: Follows existing `window.api` convention
4. **Simple Testing**: Easy to test via browser console
5. **Zero Config**: Uses electron-vite's `?modulePath` pattern
6. **Future Ready**: Foundation for more complex backend features

This approach provides a clean foundation for backend process communication while maintaining consistency with the existing codebase patterns and preparing for future backend functionality expansion.
