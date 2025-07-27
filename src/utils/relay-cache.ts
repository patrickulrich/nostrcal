/**
 * Simple in-memory cache for author relay preferences
 * Helps avoid repeated NIP-65 queries for the same authors
 */

export interface CachedAuthorRelays {
  pubkey: string;
  relays: Array<{ url: string; read: boolean; write: boolean }>;
  timestamp: number;
}

class RelayCache {
  private cache = new Map<string, CachedAuthorRelays>();
  private readonly TTL = 5 * 60 * 1000; // 5 minutes

  set(pubkey: string, relays: Array<{ url: string; read: boolean; write: boolean }>) {
    this.cache.set(pubkey, {
      pubkey,
      relays,
      timestamp: Date.now()
    });
  }

  get(pubkey: string): Array<{ url: string; read: boolean; write: boolean }> | null {
    const cached = this.cache.get(pubkey);
    if (!cached) return null;

    // Check if expired
    if (Date.now() - cached.timestamp > this.TTL) {
      this.cache.delete(pubkey);
      return null;
    }

    return cached.relays;
  }

  clear() {
    this.cache.clear();
  }

  size() {
    return this.cache.size;
  }

  // Clean up expired entries
  cleanup() {
    const now = Date.now();
    for (const [pubkey, cached] of this.cache.entries()) {
      if (now - cached.timestamp > this.TTL) {
        this.cache.delete(pubkey);
      }
    }
  }
}

// Global cache instance
export const relayCache = new RelayCache();

// Auto cleanup every 10 minutes
setInterval(() => {
  relayCache.cleanup();
}, 10 * 60 * 1000);