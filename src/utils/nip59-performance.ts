import { NostrEvent, NostrSigner } from '@nostrify/nostrify';
import { unwrapPrivateEventWithSigner, Rumor, isCalendarRumor, isGiftWrap } from './nip59';

// Cache configuration
const CACHE_MAX_SIZE = 1000;
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

interface CacheEntry {
  rumor: Rumor;
  timestamp: number;
}

class DecryptionCache {
  private cache = new Map<string, CacheEntry>();
  
  get(eventId: string): Rumor | null {
    const entry = this.cache.get(eventId);
    if (!entry) return null;
    
    // Check if expired
    if (Date.now() - entry.timestamp > CACHE_TTL) {
      this.cache.delete(eventId);
      return null;
    }
    
    return entry.rumor;
  }
  
  set(eventId: string, rumor: Rumor): void {
    // Implement LRU eviction if cache is too large
    if (this.cache.size >= CACHE_MAX_SIZE) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) this.cache.delete(oldestKey);
    }
    
    this.cache.set(eventId, {
      rumor,
      timestamp: Date.now()
    });
  }
  
  clear(): void {
    this.cache.clear();
  }
  
  get size(): number {
    return this.cache.size;
  }
}

// Global cache instance
export const decryptionCache = new DecryptionCache();

// Batch processor for parallel decryption
export class BatchDecryptor {
  private queue: Array<{
    event: NostrEvent;
    resolve: (value: Rumor | null) => void;
    reject: (error: Error) => void;
  }> = [];
  
  private processing = false;
  private batchSize: number;
  private signer: NostrSigner;
  
  constructor(signer: NostrSigner, batchSize = 5) {
    this.signer = signer;
    this.batchSize = batchSize;
  }
  
  async decrypt(event: NostrEvent): Promise<Rumor | null> {
    // Check cache first
    const cached = decryptionCache.get(event.id);
    if (cached) return cached;
    
    // Add to queue
    return new Promise((resolve, reject) => {
      this.queue.push({ event, resolve, reject });
      this.processQueue();
    });
  }
  
  private async processQueue(): Promise<void> {
    if (this.processing || this.queue.length === 0) return;
    
    this.processing = true;
    
    // Take a batch from the queue
    const batch = this.queue.splice(0, this.batchSize);
    
    // Process batch in parallel
    const promises = batch.map(async ({ event, resolve, reject: _reject }) => {
      try {
        // Check cache again (might have been processed while waiting)
        const cached = decryptionCache.get(event.id);
        if (cached) {
          resolve(cached);
          return;
        }
        
        // Decrypt the event
        const rumor = await unwrapPrivateEventWithSigner(event, this.signer);
        
        if (rumor && isCalendarRumor(rumor)) {
          // Cache the result
          decryptionCache.set(event.id, rumor);
          resolve(rumor);
        } else {
          resolve(null);
        }
      } catch (error) {
        console.warn('Decryption failed:', event.id, error);
        resolve(null); // Don't reject, just return null
      }
    });
    
    await Promise.all(promises);
    this.processing = false;
    
    // Process next batch if queue has items
    if (this.queue.length > 0) {
      setTimeout(() => this.processQueue(), 0);
    }
  }
}

// Stream processor for real-time event handling
export class StreamProcessor {
  private signer: NostrSigner;
  private batchDecryptor: BatchDecryptor;
  private onEvent: (rumor: Rumor) => void;
  private seenIds = new Set<string>();
  
  constructor(
    signer: NostrSigner, 
    onEvent: (rumor: Rumor) => void,
    options?: { batchSize?: number }
  ) {
    this.signer = signer;
    this.onEvent = onEvent;
    this.batchDecryptor = new BatchDecryptor(signer, options?.batchSize || 5);
  }
  
  async processEvent(event: NostrEvent): Promise<void> {
    // Skip if already processed
    if (this.seenIds.has(event.id)) return;
    this.seenIds.add(event.id);
    
    // Skip if not a gift wrap
    if (!isGiftWrap(event)) return;
    
    // Decrypt asynchronously
    const rumor = await this.batchDecryptor.decrypt(event);
    
    if (rumor) {
      this.onEvent(rumor);
    }
  }
  
  clear(): void {
    this.seenIds.clear();
  }
}

// Performance monitoring utilities
export class PerformanceMonitor {
  private metrics: {
    decryptionTimes: number[];
    cacheHits: number;
    cacheMisses: number;
    totalEvents: number;
  } = {
    decryptionTimes: [],
    cacheHits: 0,
    cacheMisses: 0,
    totalEvents: 0
  };
  
  recordDecryption(startTime: number): void {
    const duration = Date.now() - startTime;
    this.metrics.decryptionTimes.push(duration);
    this.metrics.totalEvents++;
  }
  
  recordCacheHit(): void {
    this.metrics.cacheHits++;
  }
  
  recordCacheMiss(): void {
    this.metrics.cacheMisses++;
  }
  
  getStats(): {
    avgDecryptionTime: number;
    cacheHitRate: number;
    totalEvents: number;
  } {
    const avgDecryptionTime = this.metrics.decryptionTimes.length > 0
      ? this.metrics.decryptionTimes.reduce((a, b) => a + b, 0) / this.metrics.decryptionTimes.length
      : 0;
    
    const cacheHitRate = this.metrics.totalEvents > 0
      ? this.metrics.cacheHits / this.metrics.totalEvents
      : 0;
    
    return {
      avgDecryptionTime,
      cacheHitRate,
      totalEvents: this.metrics.totalEvents
    };
  }
  
  reset(): void {
    this.metrics = {
      decryptionTimes: [],
      cacheHits: 0,
      cacheMisses: 0,
      totalEvents: 0
    };
  }
}