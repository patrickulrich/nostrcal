/**
 * IndexedDB utilities for PWA notification storage and calendar event caching
 * Provides persistent storage that works with service workers
 */

import { NostrEvent } from '@nostrify/nostrify';
import { CalendarEvent } from '@/contexts/EventsContextTypes';

export interface NotificationPreferences {
  enabled: boolean;
  defaultMinutesBefore: number;
  enabledEventIds: Set<string>;
  customReminderTimes: Map<string, number>;
}

export interface ScheduledNotificationData {
  eventId: string;
  eventTitle: string;
  eventTime: string; // ISO string
  notificationTime: string; // ISO string
  reminderMinutes: number;
  eventUrl: string;
}

export interface CachedPublicEvent {
  id: string; // event.id
  raw_event: NostrEvent;
  transformed_data: CalendarEvent;
  cached_at: number; // timestamp
  expires_at: number; // cached_at + 3 days
  last_seen: number; // timestamp when last seen from relay
}

export interface CachedPrivateEvent {
  id: string; // event.id
  encrypted_rumor: string; // keep as encrypted blob
  wrapper_event: NostrEvent; // the kind 1059 wrapper
  cached_at: number; // timestamp
  expires_at: number; // cached_at + 3 days
  last_seen: number; // timestamp when last seen from relay
  user_pubkey: string; // for multi-user isolation
}

export interface CachedRSVPReferencedEvent {
  id: string; // event.id
  coordinate: string; // "kind:pubkey:d-tag" - the coordinate this event satisfies
  raw_event: NostrEvent;
  transformed_data: CalendarEvent;
  cached_at: number; // timestamp
  expires_at: number; // cached_at + 3 days
  last_seen: number; // timestamp when last seen from relay
}

export interface CacheMetadata {
  key: string; // e.g., "last_sync_public", "last_sync_private_<pubkey>"
  value: string;
  updated_at: number;
}

const DB_NAME = 'NostrCalDB';
const DB_VERSION = 3; // Increased for RSVP-referenced events caching
const PREFERENCES_STORE = 'notification_preferences';
const SCHEDULED_STORE = 'scheduled_notifications';
const PUBLIC_EVENTS_STORE = 'public_calendar_events';
const PRIVATE_EVENTS_STORE = 'private_calendar_events';
const RSVP_REFERENCED_EVENTS_STORE = 'rsvp_referenced_events';
const CACHE_METADATA_STORE = 'cache_metadata';

class IndexedDBManager {
  private db: IDBDatabase | null = null;

  async initialize(): Promise<void> {
    if (this.db) return;

    return this.initializeWithRetry();
  }

  private async initializeWithRetry(retryCount = 0): Promise<void> {
    const maxRetries = 1;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = async () => {
        const error = request.error;
        console.warn('[IndexedDB] Database open failed:', error);
        
        // Check if this is a corruption/backing store error
        if (error && 
            (error.message?.includes('backing store') || 
             error.message?.includes('corruption') ||
             error.name === 'UnknownError') && 
            retryCount < maxRetries) {
          
          console.log('[IndexedDB] Detected database corruption, attempting recovery...');
          
          try {
            // Delete the corrupted database
            await this.deleteDatabase();
            console.log('[IndexedDB] Corrupted database deleted, retrying...');
            
            // Show user notification about recovery
            if (typeof window !== 'undefined' && window.dispatchEvent) {
              window.dispatchEvent(new CustomEvent('indexeddb-recovery', {
                detail: { 
                  message: 'Database recovered from corruption. Cache will rebuild automatically.',
                  type: 'info'
                }
              }));
            }
            
            // Retry initialization
            const retryResult = await this.initializeWithRetry(retryCount + 1);
            resolve(retryResult);
          } catch (deleteError) {
            console.error('[IndexedDB] Failed to recover database:', deleteError);
            reject(error);
          }
        } else {
          reject(error);
        }
      };
      
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        const oldVersion = event.oldVersion;
        
        // Create preferences store (v1)
        if (!db.objectStoreNames.contains(PREFERENCES_STORE)) {
          db.createObjectStore(PREFERENCES_STORE, { keyPath: 'id' });
        }
        
        // Create scheduled notifications store (v1)
        if (!db.objectStoreNames.contains(SCHEDULED_STORE)) {
          const scheduledStore = db.createObjectStore(SCHEDULED_STORE, { keyPath: 'eventId' });
          scheduledStore.createIndex('notificationTime', 'notificationTime', { unique: false });
        }
        
        // Calendar event caching stores (v2)
        if (oldVersion < 2) {
          // Public calendar events cache
          if (!db.objectStoreNames.contains(PUBLIC_EVENTS_STORE)) {
            const publicStore = db.createObjectStore(PUBLIC_EVENTS_STORE, { keyPath: 'id' });
            publicStore.createIndex('expires_at', 'expires_at', { unique: false });
            publicStore.createIndex('cached_at', 'cached_at', { unique: false });
            publicStore.createIndex('kind', ['raw_event.kind'], { unique: false });
            publicStore.createIndex('pubkey', ['raw_event.pubkey'], { unique: false });
            publicStore.createIndex('created_at', ['raw_event.created_at'], { unique: false });
          }
          
          // Private calendar events cache
          if (!db.objectStoreNames.contains(PRIVATE_EVENTS_STORE)) {
            const privateStore = db.createObjectStore(PRIVATE_EVENTS_STORE, { keyPath: 'id' });
            privateStore.createIndex('expires_at', 'expires_at', { unique: false });
            privateStore.createIndex('cached_at', 'cached_at', { unique: false });
            privateStore.createIndex('user_pubkey', 'user_pubkey', { unique: false });
            privateStore.createIndex('kind', ['wrapper_event.kind'], { unique: false });
          }
          
          // Cache metadata store
          if (!db.objectStoreNames.contains(CACHE_METADATA_STORE)) {
            const metadataStore = db.createObjectStore(CACHE_METADATA_STORE, { keyPath: 'key' });
            metadataStore.createIndex('updated_at', 'updated_at', { unique: false });
          }
        }
        
        // RSVP-referenced events cache (v3)
        if (oldVersion < 3) {
          if (!db.objectStoreNames.contains(RSVP_REFERENCED_EVENTS_STORE)) {
            const rsvpStore = db.createObjectStore(RSVP_REFERENCED_EVENTS_STORE, { keyPath: 'id' });
            rsvpStore.createIndex('expires_at', 'expires_at', { unique: false });
            rsvpStore.createIndex('cached_at', 'cached_at', { unique: false });
            rsvpStore.createIndex('coordinate', 'coordinate', { unique: false });
            rsvpStore.createIndex('kind', ['raw_event.kind'], { unique: false });
            rsvpStore.createIndex('pubkey', ['raw_event.pubkey'], { unique: false });
            rsvpStore.createIndex('created_at', ['raw_event.created_at'], { unique: false });
          }
        }
      };
    });
  }

  private async deleteDatabase(): Promise<void> {
    return new Promise((resolve, reject) => {
      // Close any existing connection first
      if (this.db) {
        this.db.close();
        this.db = null;
      }

      const deleteRequest = indexedDB.deleteDatabase(DB_NAME);
      
      deleteRequest.onerror = () => reject(deleteRequest.error);
      deleteRequest.onsuccess = () => {
        console.log('[IndexedDB] Database successfully deleted');
        resolve();
      };
      deleteRequest.onblocked = () => {
        console.warn('[IndexedDB] Database deletion blocked, retrying...');
        // The deletion will complete when other connections close
      };
    });
  }

  private async ensureDB(): Promise<IDBDatabase> {
    if (!this.db) {
      await this.initialize();
    }
    if (!this.db) {
      throw new Error('Failed to initialize IndexedDB');
    }
    return this.db;
  }

  // Notification Preferences
  async saveNotificationPreferences(preferences: NotificationPreferences): Promise<void> {
    const db = await this.ensureDB();
    const serialized = {
      id: 'default',
      enabled: preferences.enabled,
      defaultMinutesBefore: preferences.defaultMinutesBefore,
      enabledEventIds: Array.from(preferences.enabledEventIds),
      customReminderTimes: Array.from(preferences.customReminderTimes.entries()),
    };

    return new Promise((resolve, reject) => {
      try {
        const transaction = db.transaction([PREFERENCES_STORE], 'readwrite');
        const store = transaction.objectStore(PREFERENCES_STORE);
        const request = store.put(serialized);

        transaction.onerror = () => reject(transaction.error);
        transaction.onabort = () => reject(new Error('Transaction aborted'));
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve();
      } catch (error) {
        reject(error);
      }
    });
  }

  async loadNotificationPreferences(): Promise<NotificationPreferences> {
    const db = await this.ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([PREFERENCES_STORE], 'readonly');
      const store = transaction.objectStore(PREFERENCES_STORE);
      const request = store.get('default');

      request.onerror = () => reject(request.error);
      
      request.onsuccess = () => {
        const result = request.result;
        
        if (!result) {
          // Return default preferences
          resolve({
            enabled: false,
            defaultMinutesBefore: 15,
            enabledEventIds: new Set(),
            customReminderTimes: new Map(),
          });
          return;
        }

        const preferences: NotificationPreferences = {
          enabled: result.enabled,
          defaultMinutesBefore: result.defaultMinutesBefore,
          enabledEventIds: new Set(result.enabledEventIds || []),
          customReminderTimes: new Map(result.customReminderTimes || []),
        };

        resolve(preferences);
      };
    });
  }

  // Scheduled Notifications
  async saveScheduledNotification(notification: ScheduledNotificationData): Promise<void> {
    const db = await this.ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([SCHEDULED_STORE], 'readwrite');
      const store = transaction.objectStore(SCHEDULED_STORE);
      const request = store.put(notification);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async removeScheduledNotification(eventId: string): Promise<void> {
    const db = await this.ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([SCHEDULED_STORE], 'readwrite');
      const store = transaction.objectStore(SCHEDULED_STORE);
      const request = store.delete(eventId);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async getScheduledNotification(eventId: string): Promise<ScheduledNotificationData | null> {
    const db = await this.ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([SCHEDULED_STORE], 'readonly');
      const store = transaction.objectStore(SCHEDULED_STORE);
      const request = store.get(eventId);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result || null);
    });
  }

  async getAllScheduledNotifications(): Promise<ScheduledNotificationData[]> {
    const db = await this.ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([SCHEDULED_STORE], 'readonly');
      const store = transaction.objectStore(SCHEDULED_STORE);
      const request = store.getAll();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result || []);
    });
  }

  async getPendingNotifications(currentTime: Date = new Date()): Promise<ScheduledNotificationData[]> {
    const db = await this.ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([SCHEDULED_STORE], 'readonly');
      const store = transaction.objectStore(SCHEDULED_STORE);
      const index = store.index('notificationTime');
      
      // Get notifications that should have fired by now
      const range = IDBKeyRange.upperBound(currentTime.toISOString());
      const request = index.getAll(range);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const notifications = request.result || [];
        // Filter out past events (events that have already started)
        const validNotifications = notifications.filter(notification => 
          new Date(notification.eventTime) > currentTime
        );
        resolve(validNotifications);
      };
    });
  }

  async clearExpiredNotifications(currentTime: Date = new Date()): Promise<void> {
    const db = await this.ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([SCHEDULED_STORE], 'readwrite');
      const store = transaction.objectStore(SCHEDULED_STORE);
      const request = store.getAll();

      request.onerror = () => reject(request.error);
      
      request.onsuccess = () => {
        const notifications = request.result || [];
        const expiredIds = notifications
          .filter(notification => new Date(notification.eventTime) <= currentTime)
          .map(notification => notification.eventId);

        // Delete expired notifications
        const deletePromises = expiredIds.map(eventId => {
          return new Promise<void>((resolveDelete, rejectDelete) => {
            const deleteRequest = store.delete(eventId);
            deleteRequest.onerror = () => rejectDelete(deleteRequest.error);
            deleteRequest.onsuccess = () => resolveDelete();
          });
        });

        Promise.all(deletePromises).then(() => resolve()).catch(reject);
      };
    });
  }

  // Migration from localStorage
  async migrateFromLocalStorage(): Promise<void> {
    // Check if localStorage data exists
    const stored = localStorage.getItem('nostrcal_notification_preferences');
    if (!stored) return;

    try {
      const parsed = JSON.parse(stored);
      const preferences: NotificationPreferences = {
        enabled: parsed.enabled || false,
        defaultMinutesBefore: parsed.defaultMinutesBefore || 15,
        enabledEventIds: new Set(parsed.enabledEventIds || []),
        customReminderTimes: new Map(parsed.customReminderTimes || []),
      };

      await this.saveNotificationPreferences(preferences);
      
      // Remove from localStorage after successful migration
      localStorage.removeItem('nostrcal_notification_preferences');
      
      console.log('Successfully migrated notification preferences from localStorage to IndexedDB');
    } catch (error) {
      console.error('Failed to migrate notification preferences:', error);
    }
  }

  // ============================================================================
  // CALENDAR EVENT CACHING
  // ============================================================================

  // Public Events Cache
  async cachePublicEvent(event: NostrEvent, transformedData: CalendarEvent): Promise<void> {
    const db = await this.ensureDB();
    const now = Date.now();
    const threeDaysInMs = 3 * 24 * 60 * 60 * 1000; // 3 days
    
    // Check cache size and cleanup if needed
    const stats = await this.getCacheStats();
    const maxEvents = 1000; // Limit to 1000 events (~2MB)
    
    if (stats.publicEvents >= maxEvents) {
      // Remove oldest events to make space
      await this.cleanupOldestEvents('public', Math.floor(maxEvents * 0.1)); // Remove 10%
    }
    
    const cachedEvent: CachedPublicEvent = {
      id: event.id,
      raw_event: event,
      transformed_data: transformedData,
      cached_at: now,
      expires_at: now + threeDaysInMs,
      last_seen: now,
    };

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([PUBLIC_EVENTS_STORE], 'readwrite');
      const store = transaction.objectStore(PUBLIC_EVENTS_STORE);
      const request = store.put(cachedEvent);

      request.onerror = () => {
        // Handle quota exceeded error specifically
        if (request.error?.name === 'QuotaExceededError') {
          reject(new Error('Storage quota exceeded'));
        } else {
          reject(request.error);
        }
      };
      request.onsuccess = () => resolve();
    });
  }

  async getCachedPublicEvents(options: {
    includeExpired?: boolean;
    kinds?: number[];
    pubkeys?: string[];
    since?: number;
    until?: number;
  } = {}): Promise<CachedPublicEvent[]> {
    const db = await this.ensureDB();
    const now = Date.now();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([PUBLIC_EVENTS_STORE], 'readonly');
      const store = transaction.objectStore(PUBLIC_EVENTS_STORE);
      const request = store.getAll();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        let events = request.result || [];

        // Filter expired events unless requested
        if (!options.includeExpired) {
          events = events.filter(event => event.expires_at > now);
        }

        // Filter by kinds
        if (options.kinds && options.kinds.length > 0) {
          events = events.filter(event => options.kinds!.includes(event.raw_event.kind));
        }

        // Filter by pubkeys
        if (options.pubkeys && options.pubkeys.length > 0) {
          events = events.filter(event => options.pubkeys!.includes(event.raw_event.pubkey));
        }

        // Filter by time range
        if (options.since) {
          events = events.filter(event => event.raw_event.created_at >= options.since!);
        }
        if (options.until) {
          events = events.filter(event => event.raw_event.created_at <= options.until!);
        }

        resolve(events);
      };
    });
  }

  async updatePublicEventLastSeen(eventId: string): Promise<void> {
    const db = await this.ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([PUBLIC_EVENTS_STORE], 'readwrite');
      const store = transaction.objectStore(PUBLIC_EVENTS_STORE);
      const getRequest = store.get(eventId);

      getRequest.onerror = () => reject(getRequest.error);
      getRequest.onsuccess = () => {
        const cachedEvent = getRequest.result;
        if (!cachedEvent) {
          resolve(); // Event not in cache, nothing to update
          return;
        }

        cachedEvent.last_seen = Date.now();
        const putRequest = store.put(cachedEvent);
        putRequest.onerror = () => reject(putRequest.error);
        putRequest.onsuccess = () => resolve();
      };
    });
  }

  // Private Events Cache  
  async cachePrivateEvent(eventId: string, encryptedRumor: string, wrapperEvent: NostrEvent, userPubkey: string): Promise<void> {
    const db = await this.ensureDB();
    const now = Date.now();
    const threeDaysInMs = 3 * 24 * 60 * 60 * 1000; // 3 days
    
    const cachedEvent: CachedPrivateEvent = {
      id: eventId,
      encrypted_rumor: encryptedRumor,
      wrapper_event: wrapperEvent,
      cached_at: now,
      expires_at: now + threeDaysInMs,
      last_seen: now,
      user_pubkey: userPubkey,
    };

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([PRIVATE_EVENTS_STORE], 'readwrite');
      const store = transaction.objectStore(PRIVATE_EVENTS_STORE);
      const request = store.put(cachedEvent);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async getCachedPrivateEvents(userPubkey: string, options: {
    includeExpired?: boolean;
    since?: number;
    until?: number;
  } = {}): Promise<CachedPrivateEvent[]> {
    const db = await this.ensureDB();
    const now = Date.now();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([PRIVATE_EVENTS_STORE], 'readonly');
      const store = transaction.objectStore(PRIVATE_EVENTS_STORE);
      const index = store.index('user_pubkey');
      const request = index.getAll(userPubkey);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        let events = request.result || [];

        // Filter expired events unless requested
        if (!options.includeExpired) {
          events = events.filter(event => event.expires_at > now);
        }

        // Filter by time range (using wrapper event created_at)
        if (options.since) {
          events = events.filter(event => event.wrapper_event.created_at >= options.since!);
        }
        if (options.until) {
          events = events.filter(event => event.wrapper_event.created_at <= options.until!);
        }

        resolve(events);
      };
    });
  }

  async clearUserPrivateCache(userPubkey: string): Promise<void> {
    const db = await this.ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([PRIVATE_EVENTS_STORE], 'readwrite');
      const store = transaction.objectStore(PRIVATE_EVENTS_STORE);
      const index = store.index('user_pubkey');
      const request = index.getAll(userPubkey);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const events = request.result || [];
        const deletePromises = events.map(event => {
          return new Promise<void>((resolveDelete, rejectDelete) => {
            const deleteRequest = store.delete(event.id);
            deleteRequest.onerror = () => rejectDelete(deleteRequest.error);
            deleteRequest.onsuccess = () => resolveDelete();
          });
        });

        Promise.all(deletePromises).then(() => resolve()).catch(reject);
      };
    });
  }

  // RSVP-Referenced Events Cache
  async cacheRSVPReferencedEvent(event: NostrEvent, transformedData: CalendarEvent, coordinate: string): Promise<void> {
    const db = await this.ensureDB();
    const now = Date.now();
    const threeDaysInMs = 3 * 24 * 60 * 60 * 1000; // 3 days
    
    const cachedEvent: CachedRSVPReferencedEvent = {
      id: event.id,
      coordinate,
      raw_event: event,
      transformed_data: transformedData,
      cached_at: now,
      expires_at: now + threeDaysInMs,
      last_seen: now,
    };

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([RSVP_REFERENCED_EVENTS_STORE], 'readwrite');
      const store = transaction.objectStore(RSVP_REFERENCED_EVENTS_STORE);
      const request = store.put(cachedEvent);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async getCachedRSVPReferencedEventsByCoordinates(coordinates: string[], options: {
    includeExpired?: boolean;
  } = {}): Promise<CachedRSVPReferencedEvent[]> {
    const db = await this.ensureDB();
    const now = Date.now();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([RSVP_REFERENCED_EVENTS_STORE], 'readonly');
      const store = transaction.objectStore(RSVP_REFERENCED_EVENTS_STORE);
      const index = store.index('coordinate');
      
      const results: CachedRSVPReferencedEvent[] = [];
      let completed = 0;

      if (coordinates.length === 0) {
        resolve([]);
        return;
      }

      coordinates.forEach(coordinate => {
        const request = index.getAll(coordinate);
        
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          let events = request.result || [];
          
          // Filter expired events unless requested
          if (!options.includeExpired) {
            events = events.filter(event => event.expires_at > now);
          }
          
          results.push(...events);
          completed++;
          
          if (completed === coordinates.length) {
            resolve(results);
          }
        };
      });
    });
  }

  async updateRSVPReferencedEventLastSeen(eventId: string): Promise<void> {
    const db = await this.ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([RSVP_REFERENCED_EVENTS_STORE], 'readwrite');
      const store = transaction.objectStore(RSVP_REFERENCED_EVENTS_STORE);
      const getRequest = store.get(eventId);

      getRequest.onerror = () => reject(getRequest.error);
      getRequest.onsuccess = () => {
        const cachedEvent = getRequest.result;
        if (!cachedEvent) {
          resolve(); // Event not in cache, nothing to update
          return;
        }

        cachedEvent.last_seen = Date.now();
        const putRequest = store.put(cachedEvent);
        putRequest.onerror = () => reject(putRequest.error);
        putRequest.onsuccess = () => resolve();
      };
    });
  }

  // Cache Cleanup
  async cleanupExpiredEvents(): Promise<{ deletedPublic: number; deletedPrivate: number; deletedRSVP: number }> {
    const db = await this.ensureDB();
    const now = Date.now();
    let deletedPublic = 0;
    let deletedPrivate = 0;
    let deletedRSVP = 0;

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([PUBLIC_EVENTS_STORE, PRIVATE_EVENTS_STORE, RSVP_REFERENCED_EVENTS_STORE], 'readwrite');
      
      // Clean public events
      const publicStore = transaction.objectStore(PUBLIC_EVENTS_STORE);
      const publicIndex = publicStore.index('expires_at');
      const publicRange = IDBKeyRange.upperBound(now);
      const publicRequest = publicIndex.getAll(publicRange);

      publicRequest.onsuccess = () => {
        const expiredPublic = publicRequest.result || [];
        deletedPublic = expiredPublic.length;
        
        const deletePublicPromises = expiredPublic.map(event => {
          return new Promise<void>((resolveDelete, rejectDelete) => {
            const deleteRequest = publicStore.delete(event.id);
            deleteRequest.onerror = () => rejectDelete(deleteRequest.error);
            deleteRequest.onsuccess = () => resolveDelete();
          });
        });

        // Clean private events
        const privateStore = transaction.objectStore(PRIVATE_EVENTS_STORE);
        const privateIndex = privateStore.index('expires_at');
        const privateRequest = privateIndex.getAll(publicRange);

        privateRequest.onsuccess = () => {
          const expiredPrivate = privateRequest.result || [];
          deletedPrivate = expiredPrivate.length;
          
          const deletePrivatePromises = expiredPrivate.map(event => {
            return new Promise<void>((resolveDelete, rejectDelete) => {
              const deleteRequest = privateStore.delete(event.id);
              deleteRequest.onerror = () => rejectDelete(deleteRequest.error);
              deleteRequest.onsuccess = () => resolveDelete();
            });
          });

          // Clean RSVP-referenced events
          const rsvpStore = transaction.objectStore(RSVP_REFERENCED_EVENTS_STORE);
          const rsvpIndex = rsvpStore.index('expires_at');
          const rsvpRequest = rsvpIndex.getAll(publicRange);

          rsvpRequest.onsuccess = () => {
            const expiredRSVP = rsvpRequest.result || [];
            deletedRSVP = expiredRSVP.length;
            
            const deleteRSVPPromises = expiredRSVP.map(event => {
              return new Promise<void>((resolveDelete, rejectDelete) => {
                const deleteRequest = rsvpStore.delete(event.id);
                deleteRequest.onerror = () => rejectDelete(deleteRequest.error);
                deleteRequest.onsuccess = () => resolveDelete();
              });
            });

            // Wait for all deletions to complete
            Promise.all([...deletePublicPromises, ...deletePrivatePromises, ...deleteRSVPPromises])
              .then(() => resolve({ deletedPublic, deletedPrivate, deletedRSVP }))
              .catch(reject);
          };

          rsvpRequest.onerror = () => reject(rsvpRequest.error);
        };

        privateRequest.onerror = () => reject(privateRequest.error);
      };

      publicRequest.onerror = () => reject(publicRequest.error);
    });
  }

  // Cache Metadata
  async setCacheMetadata(key: string, value: string): Promise<void> {
    const db = await this.ensureDB();
    const metadata: CacheMetadata = {
      key,
      value,
      updated_at: Date.now(),
    };

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([CACHE_METADATA_STORE], 'readwrite');
      const store = transaction.objectStore(CACHE_METADATA_STORE);
      const request = store.put(metadata);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async getCacheMetadata(key: string): Promise<string | null> {
    const db = await this.ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([CACHE_METADATA_STORE], 'readonly');
      const store = transaction.objectStore(CACHE_METADATA_STORE);
      const request = store.get(key);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const result = request.result;
        resolve(result ? result.value : null);
      };
    });
  }

  // Storage Management
  async getCacheStats(): Promise<{
    publicEvents: number;
    privateEvents: number;
    rsvpReferencedEvents: number;
    totalSize: number; // approximate
  }> {
    const db = await this.ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([PUBLIC_EVENTS_STORE, PRIVATE_EVENTS_STORE, RSVP_REFERENCED_EVENTS_STORE], 'readonly');
      
      const publicStore = transaction.objectStore(PUBLIC_EVENTS_STORE);
      const privateStore = transaction.objectStore(PRIVATE_EVENTS_STORE);
      const rsvpStore = transaction.objectStore(RSVP_REFERENCED_EVENTS_STORE);
      
      const publicRequest = publicStore.count();
      const privateRequest = privateStore.count();
      const rsvpRequest = rsvpStore.count();

      let publicCount = 0;
      let privateCount = 0;
      let rsvpCount = 0;

      publicRequest.onsuccess = () => {
        publicCount = publicRequest.result;
        
        privateRequest.onsuccess = () => {
          privateCount = privateRequest.result;
          
          rsvpRequest.onsuccess = () => {
            rsvpCount = rsvpRequest.result;
            
            // Rough size estimation (each event ~2KB average)
            const totalSize = (publicCount + privateCount + rsvpCount) * 2048;
            
            resolve({
              publicEvents: publicCount,
              privateEvents: privateCount,
              rsvpReferencedEvents: rsvpCount,
              totalSize,
            });
          };
          
          rsvpRequest.onerror = () => reject(rsvpRequest.error);
        };
        
        privateRequest.onerror = () => reject(privateRequest.error);
      };
      
      publicRequest.onerror = () => reject(publicRequest.error);
    });
  }

  async cleanupOldestEvents(type: 'public' | 'private', countToRemove: number): Promise<number> {
    const db = await this.ensureDB();
    const storeName = type === 'public' ? PUBLIC_EVENTS_STORE : PRIVATE_EVENTS_STORE;

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const index = store.index('cached_at');
      
      // Get oldest events first
      const request = index.openCursor();
      const eventsToDelete: string[] = [];
      let count = 0;

      request.onsuccess = () => {
        const cursor = request.result;
        if (cursor && count < countToRemove) {
          eventsToDelete.push(cursor.value.id);
          count++;
          cursor.continue();
        } else {
          // Delete the collected events
          const deletePromises = eventsToDelete.map(eventId => {
            return new Promise<void>((resolveDelete, rejectDelete) => {
              const deleteRequest = store.delete(eventId);
              deleteRequest.onerror = () => rejectDelete(deleteRequest.error);
              deleteRequest.onsuccess = () => resolveDelete();
            });
          });

          Promise.all(deletePromises)
            .then(() => resolve(eventsToDelete.length))
            .catch(reject);
        }
      };

      request.onerror = () => reject(request.error);
    });
  }

  async clearAllCachedEvents(): Promise<void> {
    const db = await this.ensureDB();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([PUBLIC_EVENTS_STORE, PRIVATE_EVENTS_STORE, RSVP_REFERENCED_EVENTS_STORE], 'readwrite');
      
      const clearPromises: Promise<void>[] = [];
      
      // Clear public events
      clearPromises.push(new Promise<void>((resolveStore, rejectStore) => {
        const clearRequest = transaction.objectStore(PUBLIC_EVENTS_STORE).clear();
        clearRequest.onsuccess = () => resolveStore();
        clearRequest.onerror = () => rejectStore(clearRequest.error);
      }));
      
      // Clear private events  
      clearPromises.push(new Promise<void>((resolveStore, rejectStore) => {
        const clearRequest = transaction.objectStore(PRIVATE_EVENTS_STORE).clear();
        clearRequest.onsuccess = () => resolveStore();
        clearRequest.onerror = () => rejectStore(clearRequest.error);
      }));
      
      // Clear RSVP referenced events
      clearPromises.push(new Promise<void>((resolveStore, rejectStore) => {
        const clearRequest = transaction.objectStore(RSVP_REFERENCED_EVENTS_STORE).clear();
        clearRequest.onsuccess = () => resolveStore();
        clearRequest.onerror = () => rejectStore(clearRequest.error);
      }));
      
      Promise.all(clearPromises)
        .then(() => resolve())
        .catch(reject);
        
      transaction.onerror = () => reject(transaction.error);
    });
  }
}

// Create singleton instance
const dbManager = new IndexedDBManager();

// Export the instance for use throughout the app
export { dbManager };

// Export utility functions for easier usage
export async function saveNotificationPreferences(preferences: NotificationPreferences): Promise<void> {
  return dbManager.saveNotificationPreferences(preferences);
}

export async function loadNotificationPreferences(): Promise<NotificationPreferences> {
  return dbManager.loadNotificationPreferences();
}

export async function saveScheduledNotification(notification: ScheduledNotificationData): Promise<void> {
  return dbManager.saveScheduledNotification(notification);
}

export async function removeScheduledNotification(eventId: string): Promise<void> {
  return dbManager.removeScheduledNotification(eventId);
}

export async function getAllScheduledNotifications(): Promise<ScheduledNotificationData[]> {
  return dbManager.getAllScheduledNotifications();
}

export async function getPendingNotifications(currentTime?: Date): Promise<ScheduledNotificationData[]> {
  return dbManager.getPendingNotifications(currentTime);
}

export async function clearExpiredNotifications(currentTime?: Date): Promise<void> {
  return dbManager.clearExpiredNotifications(currentTime);
}

export async function migrateFromLocalStorage(): Promise<void> {
  return dbManager.migrateFromLocalStorage();
}

// ============================================================================
// CALENDAR EVENT CACHING EXPORTS
// ============================================================================

// Public Events Cache
export async function cachePublicEvent(event: NostrEvent, transformedData: CalendarEvent): Promise<void> {
  return dbManager.cachePublicEvent(event, transformedData);
}

export async function getCachedPublicEvents(options?: {
  includeExpired?: boolean;
  kinds?: number[];
  pubkeys?: string[];
  since?: number;
  until?: number;
}): Promise<CachedPublicEvent[]> {
  return dbManager.getCachedPublicEvents(options);
}

export async function updatePublicEventLastSeen(eventId: string): Promise<void> {
  return dbManager.updatePublicEventLastSeen(eventId);
}

// Private Events Cache
export async function cachePrivateEvent(eventId: string, encryptedRumor: string, wrapperEvent: NostrEvent, userPubkey: string): Promise<void> {
  return dbManager.cachePrivateEvent(eventId, encryptedRumor, wrapperEvent, userPubkey);
}

export async function getCachedPrivateEvents(userPubkey: string, options?: {
  includeExpired?: boolean;
  since?: number;
  until?: number;
}): Promise<CachedPrivateEvent[]> {
  return dbManager.getCachedPrivateEvents(userPubkey, options);
}

export async function clearUserPrivateCache(userPubkey: string): Promise<void> {
  return dbManager.clearUserPrivateCache(userPubkey);
}

// RSVP-Referenced Events Cache
export async function cacheRSVPReferencedEvent(event: NostrEvent, transformedData: CalendarEvent, coordinate: string): Promise<void> {
  return dbManager.cacheRSVPReferencedEvent(event, transformedData, coordinate);
}

export async function getCachedRSVPReferencedEventsByCoordinates(coordinates: string[], options?: {
  includeExpired?: boolean;
}): Promise<CachedRSVPReferencedEvent[]> {
  return dbManager.getCachedRSVPReferencedEventsByCoordinates(coordinates, options);
}

export async function updateRSVPReferencedEventLastSeen(eventId: string): Promise<void> {
  return dbManager.updateRSVPReferencedEventLastSeen(eventId);
}

// Cache Management
export async function cleanupExpiredEvents(): Promise<{ deletedPublic: number; deletedPrivate: number; deletedRSVP: number }> {
  return dbManager.cleanupExpiredEvents();
}

export async function setCacheMetadata(key: string, value: string): Promise<void> {
  return dbManager.setCacheMetadata(key, value);
}

export async function getCacheMetadata(key: string): Promise<string | null> {
  return dbManager.getCacheMetadata(key);
}

export async function getCacheStats(): Promise<{
  publicEvents: number;
  privateEvents: number;
  rsvpReferencedEvents: number;
  totalSize: number;
}> {
  return dbManager.getCacheStats();
}

export async function cleanupOldestEvents(type: 'public' | 'private', countToRemove: number): Promise<number> {
  return dbManager.cleanupOldestEvents(type, countToRemove);
}

// Clear all cached events (used on logout)
export async function clearAllCachedEvents(): Promise<void> {
  return dbManager.clearAllCachedEvents();
}

// Initialize IndexedDB on module load
export async function initializeDB(): Promise<void> {
  await dbManager.initialize();
  await dbManager.migrateFromLocalStorage();
}