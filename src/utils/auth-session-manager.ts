import { NostrEvent, NostrSigner } from '@nostrify/nostrify';
import { createAuthEvent, normalizeRelayUrl } from './nostr-auth';

interface AuthSession {
  url: string;
  timestamp: number;
  valid: boolean;
  attempts: number;
  lastAuthEvent?: NostrEvent;
  lastChallenge?: string;
}

export class AuthSessionManager {
  private sessions = new Map<string, AuthSession>();
  private readonly SESSION_DURATION = 300000; // 5 minutes
  private readonly MAX_ATTEMPTS = 3;

  /**
   * Check if relay has valid authentication session
   */
  hasValidSession(url: string): boolean {
    const normalized = normalizeRelayUrl(url);
    const session = this.sessions.get(normalized);
    
    if (!session || !session.valid) return false;
    
    const now = Date.now();
    const expired = (now - session.timestamp) > this.SESSION_DURATION;
    
    if (expired) {
      this.invalidateSession(normalized);
      return false;
    }
    
    return true;
  }

  /**
   * Create authentication event with session management
   */
  async authenticate(url: string, challenge: string, signer: NostrSigner): Promise<NostrEvent | null> {
    const normalized = normalizeRelayUrl(url);
    
    // Check if we have a valid session
    if (this.hasValidSession(normalized)) {
      return null; // No auth needed - session valid
    }
    
    const session = this.sessions.get(normalized) || {
      url: normalized,
      timestamp: 0,
      valid: false,
      attempts: 0
    };
    
    // Check attempt limits
    if (session.attempts >= this.MAX_ATTEMPTS) {
      console.warn('⚠️ [AuthSession] Max attempts reached for:', normalized);
      throw new Error(`Max authentication attempts (${this.MAX_ATTEMPTS}) reached for ${normalized}`);
    }


    try {
      const authEvent = await createAuthEvent(challenge, normalized, signer);
      
      
      // Store successful session
      this.sessions.set(normalized, {
        url: normalized,
        timestamp: Date.now(),
        valid: true,
        attempts: 0, // Reset on success
        lastAuthEvent: authEvent,
        lastChallenge: challenge
      });
      
      return authEvent;
      
    } catch (error) {
      // Update failed attempt
      this.sessions.set(normalized, {
        ...session,
        attempts: session.attempts + 1,
        valid: false,
        timestamp: Date.now()
      });
      
      console.error('❌ [AuthSession] Authentication failed:', {
        url: normalized,
        attempts: session.attempts + 1,
        error
      });
      
      throw error;
    }
  }

  /**
   * Mark session as invalid (connection issues, auth failures, etc.)
   */
  invalidateSession(url: string): void {
    const normalized = normalizeRelayUrl(url);
    const session = this.sessions.get(normalized);
    
    if (session) {
      this.sessions.set(normalized, {
        ...session,
        valid: false,
        timestamp: Date.now()
      });
    }
  }

  /**
   * Get session info for debugging
   */
  getSessionInfo(url: string): AuthSession | undefined {
    return this.sessions.get(normalizeRelayUrl(url));
  }

  /**
   * Get all sessions for debugging
   */
  getAllSessions(): Map<string, AuthSession> {
    return new Map(this.sessions);
  }

  /**
   * Clear expired sessions
   */
  cleanup(): void {
    const now = Date.now();
    for (const [url, session] of this.sessions.entries()) {
      if ((now - session.timestamp) > this.SESSION_DURATION) {
        this.sessions.delete(url);
      }
    }
  }

  /**
   * Reset all sessions (useful for login/logout)
   */
  reset(): void {
    this.sessions.clear();
  }
}

// Global session manager instance
export const authSessionManager = new AuthSessionManager();

// Cleanup expired sessions every 5 minutes
if (typeof window !== 'undefined') {
  setInterval(() => {
    authSessionManager.cleanup();
  }, 300000);
}