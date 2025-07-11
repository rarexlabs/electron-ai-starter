export class StreamSession {
  private abortController = new AbortController()

  constructor(
    public readonly id: string,
    public readonly createdAt: Date = new Date()
  ) {}

  get abortSignal(): AbortSignal {
    return this.abortController.signal
  }

  abort(): void {
    this.abortController.abort()
  }
}

export class StreamSessionStore {
  private activeStreamSessions = new Map<string, StreamSession>()

  createSession(): StreamSession {
    const sessionId = Date.now().toString()
    const session = new StreamSession(sessionId)

    this.activeStreamSessions.set(sessionId, session)
    return session
  }

  getSession(sessionId: string): StreamSession | undefined {
    return this.activeStreamSessions.get(sessionId)
  }

  abortSession(sessionId: string): boolean {
    const session = this.activeStreamSessions.get(sessionId)
    if (session) {
      session.abort()
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