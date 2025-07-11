import type { AIStreamSession } from '@common/types'

export class StreamSessionStore {
  private activeStreamSessions = new Map<string, AIStreamSession>()

  createSession(): AIStreamSession {
    const sessionId = Date.now().toString()
    const abortController = new AbortController()

    const session: AIStreamSession = {
      id: sessionId,
      abortController,
      createdAt: new Date()
    }

    this.activeStreamSessions.set(sessionId, session)
    return session
  }

  getSession(sessionId: string): AIStreamSession | undefined {
    return this.activeStreamSessions.get(sessionId)
  }

  abortSession(sessionId: string): boolean {
    const session = this.activeStreamSessions.get(sessionId)
    if (session) {
      session.abortController.abort()
      this.cleanupSession(sessionId)
      return true
    }
    return false
  }

  cleanupSession(sessionId: string): void {
    this.activeStreamSessions.delete(sessionId)
  }
}

export const sessionStore = new StreamSessionStore()