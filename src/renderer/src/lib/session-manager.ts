import { logger } from '@/lib/logger'

export interface SessionState {
  sessionId: string
  isActive: boolean
  aborted: boolean
  error: string | null
  createdAt: Date
}

export class SessionManager {
  private sessions = new Map<string, SessionState>()
  private abortControllers = new Map<string, AbortController>()

  createSession(sessionId: string): AbortController {
    const abortController = new AbortController()

    const session: SessionState = {
      sessionId,
      isActive: true,
      aborted: false,
      error: null,
      createdAt: new Date()
    }

    this.sessions.set(sessionId, session)
    this.abortControllers.set(sessionId, abortController)

    logger.info('📝 Session created:', sessionId)
    return abortController
  }

  getSession(sessionId: string): SessionState | undefined {
    return this.sessions.get(sessionId)
  }

  isSessionActive(sessionId: string): boolean {
    const session = this.sessions.get(sessionId)
    return session?.isActive === true && !session.aborted
  }

  async abortSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId)
    const abortController = this.abortControllers.get(sessionId)

    if (!session) {
      logger.warn('❌ Attempted to abort non-existent session:', sessionId)
      return
    }

    // Check if session is already aborted to prevent duplicate calls
    if (session.aborted) {
      logger.info('🚫 Session already aborted, skipping:', sessionId)
      return
    }

    logger.info('🚫 Aborting session:', sessionId)

    // Update session state
    session.aborted = true
    session.isActive = false

    // Trigger abort signal
    if (abortController) {
      abortController.abort()
    }

    // Send abort to main process
    try {
      await window.api.abortAIChat(sessionId)
    } catch (error) {
      logger.error('Failed to abort chat session:', error)
    }
  }

  completeSession(sessionId: string): void {
    const session = this.sessions.get(sessionId)
    if (session) {
      session.isActive = false
      logger.info('✅ Session completed:', sessionId)
    }
  }

  errorSession(sessionId: string, error: string): void {
    const session = this.sessions.get(sessionId)
    if (session) {
      session.isActive = false
      session.error = error
      logger.error('❌ Session error:', sessionId, error)
    }
  }

  cleanupSession(sessionId: string): void {
    const session = this.sessions.get(sessionId)
    if (session) {
      logger.info('🧹 Cleaning up session:', sessionId)
      this.sessions.delete(sessionId)
      this.abortControllers.delete(sessionId)
    }
  }

  getAbortSignal(sessionId: string): AbortSignal | undefined {
    return this.abortControllers.get(sessionId)?.signal
  }

  // Cleanup old sessions (optional utility)
  cleanupOldSessions(maxAge: number = 5 * 60 * 1000): void {
    const now = Date.now()
    for (const [sessionId, session] of this.sessions) {
      if (now - session.createdAt.getTime() > maxAge && !session.isActive) {
        this.cleanupSession(sessionId)
      }
    }
  }

  // Get all active sessions (for debugging)
  getActiveSessions(): SessionState[] {
    return Array.from(this.sessions.values()).filter((s) => s.isActive)
  }
}

// Singleton instance
export const sessionManager = new SessionManager()
