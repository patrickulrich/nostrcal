/**
 * IndexedDB utilities for PWA notification storage
 * Provides persistent storage that works with service workers
 */

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

const DB_NAME = 'NostrCalDB';
const DB_VERSION = 1;
const PREFERENCES_STORE = 'notification_preferences';
const SCHEDULED_STORE = 'scheduled_notifications';

class IndexedDBManager {
  private db: IDBDatabase | null = null;

  async initialize(): Promise<void> {
    if (this.db) return;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Create preferences store
        if (!db.objectStoreNames.contains(PREFERENCES_STORE)) {
          db.createObjectStore(PREFERENCES_STORE, { keyPath: 'id' });
        }
        
        // Create scheduled notifications store
        if (!db.objectStoreNames.contains(SCHEDULED_STORE)) {
          const scheduledStore = db.createObjectStore(SCHEDULED_STORE, { keyPath: 'eventId' });
          scheduledStore.createIndex('notificationTime', 'notificationTime', { unique: false });
        }
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

// Initialize IndexedDB on module load
export async function initializeDB(): Promise<void> {
  await dbManager.initialize();
  await dbManager.migrateFromLocalStorage();
}