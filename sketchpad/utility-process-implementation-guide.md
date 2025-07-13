# Electron Utility Process Direct Communication - Learnings & Gotchas

This guide documents the key learnings and gotchas for implementing direct renderer ↔ utility process communication in Electron using MessageChannels.

## Architecture Overview

**Main Process**: Creates MessageChannelMain, distributes ports to utility process and renderer
**Utility Process**: Node.js context, receives port1, uses Node.js-style event API
**Renderer Process**: Web context with context isolation, receives port2 via preload script
**Preload Script**: Bridge between contexts, handles MessagePort operations for renderer

## File Structure Pattern

- Main process: Utility spawning + MessageChannel creation
- Preload script: MessagePort bridging + contextBridge API exposure  
- Renderer: Clean API consumption via window.api
- Utility process: TypeScript worker in src/utility/ folder

## Major Gotchas & Solutions

### 1. **Context Isolation MessagePort Issue**
- **Problem**: MessagePorts received in renderer with context isolation don't have working `postMessage()`
- **Solution**: Handle all MessagePort operations in preload script, expose clean API to renderer
- **Symptom**: `TypeError: port.postMessage is not a function`

### 2. **Utility Process API Differences**
- **Problem**: MessagePorts in utility processes use Node.js-style API, not web-style
- **Solution**: Use `port.on('message')` + `port.start()` in utility process
- **Symptom**: Messages sent from renderer never reach utility process

### 3. **React StrictMode Duplicate Setup**
- **Problem**: React StrictMode causes effects to run twice, creating multiple MessageChannels
- **Solution**: Add `communicationSetup` flag to prevent duplicate channel creation
- **Symptom**: Double setup logs, mixed up message routing

### 4. **Build Configuration for Utility Worker**
- **Problem**: Utility worker TypeScript compilation and path resolution
- **Solution**: Configure electron-vite to build utility process separately, use relative path
- **Note**: Utility process runs built `.js` files, not source `.ts`

### 5. **Timing Issues**
- **Problem**: Renderer tries to setup communication before utility process is ready
- **Solution**: Add retry logic with `isUtilityProcessReady` checks and delays
- **Symptom**: "Utility process not ready" errors

### 6. **MessagePort API Inconsistency**
- **Utility Process**: Node.js style (`port.on('message')`, `port.start()`)
- **Preload/Renderer**: Web style (`port.onmessage`)
- **Main Process**: Node.js style (`MessageChannelMain`, `port.on('message')`)

## Critical Implementation Insights

### Duplicate Setup Prevention
- React StrictMode triggers effects twice
- Need global flag to prevent multiple MessageChannel creation
- Reset flag when utility process exits

### Timing Coordination
- Utility process must be ready before MessageChannel setup
- Add retry logic with readiness checks
- Use setTimeout for initial setup requests

### Context Bridging Pattern
- Preload script stores MessagePort globally
- Exposes clean API methods to renderer via contextBridge
- Forwards messages between MessagePort and renderer callbacks

### TypeScript Build Integration
- Utility process runs compiled .js files
- Use relative paths from built main process
- Configure separate build if needed

## Testing Strategy

1. **Connection Test**: Verify "connected" message appears in UI
2. **Ping/Pong**: Test basic bidirectional messaging  
3. **Echo Test**: Test data serialization/deserialization
4. **Performance Test**: Measure latency and throughput
5. **Complex Data**: Test large object transfer

## Performance Characteristics

- **Latency**: ~1ms for simple messages
- **Throughput**: Handles burst of 1000+ messages efficiently
- **Memory**: Minimal overhead compared to main process relay
- **CPU**: True process isolation for intensive tasks

## When to Use Utility Process vs Worker Threads

### Utility Process Advantages:
- ✅ Direct renderer communication (bypasses main process)
- ✅ True process isolation
- ✅ Separate memory space
- ✅ Can use all Node.js APIs
- ✅ Won't block main process

### Worker Thread Advantages:
- ✅ Shared memory space (faster data transfer)
- ✅ Lower overhead
- ✅ Standard Node.js feature

## Key Success Factors

1. **Handle MessagePorts in preload script only** - Context isolation prevents direct renderer access
2. **Use correct API style for each context** - Node.js vs Web style APIs
3. **Prevent duplicate setups** - Essential for React applications
4. **Handle timing and readiness** - Coordination between process spawning and channel setup
5. **Proper error handling** - Graceful degradation when utility process unavailable

## Conclusion

Renderer ↔ utility process direct communication is not only possible but performant and reliable in production Electron applications. The MessagePort approach works once context isolation and API differences are properly handled through the preload script bridge pattern.