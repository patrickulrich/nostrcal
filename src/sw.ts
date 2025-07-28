/**
 * Custom Service Worker for NostrCal PWA
 * Handles background notification scheduling and display
 */

/// <reference lib="webworker" />

import { clientsClaim } from 'workbox-core';
import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { CacheFirst, NetworkOnly } from 'workbox-strategies';

declare const self: ServiceWorkerGlobalScope;

// Service Worker specific notification options
interface ServiceWorkerNotificationOptions extends NotificationOptions {
  actions?: Array<{
    action: string;
    title: string;
    icon?: string;
  }>;
  data?: any;
}

// Take control immediately
self.skipWaiting();
clientsClaim();

// Precache and route static assets
precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

// Runtime caching strategies
registerRoute(
  /^wss:\/\/.*/,
  new NetworkOnly()
);

registerRoute(
  /^https:\/\/.*\.(?:png|jpg|jpeg|svg|gif|webp)$/,
  new CacheFirst({
    cacheName: 'images',
    plugins: [
      {
        cacheKeyWillBeUsed: async ({ request }) => {
          return `${request.url}?v=${Date.now()}`;
        },
      },
    ],
  })
);

// Notification scheduling system
interface ScheduledNotificationData {
  eventId: string;
  eventTitle: string;
  eventTime: string; // ISO string
  notificationTime: string; // ISO string
  reminderMinutes: number;
  eventUrl: string;
}

interface ServiceWorkerMessage {
  type: string;
  payload?: any;
}

// IndexedDB operations within service worker
const DB_NAME = 'NostrCalDB';
const DB_VERSION = 1;
const SCHEDULED_STORE = 'scheduled_notifications';

class ServiceWorkerDB {
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
      throw new Error('Failed to initialize IndexedDB in service worker');
    }
    return this.db;
  }

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

  async getPendingNotifications(currentTime: Date = new Date()): Promise<ScheduledNotificationData[]> {
    const db = await this.ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([SCHEDULED_STORE], 'readonly');
      const store = transaction.objectStore(SCHEDULED_STORE);
      const index = store.index('notificationTime');
      
      const range = IDBKeyRange.upperBound(currentTime.toISOString());
      const request = index.getAll(range);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const notifications = request.result || [];
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
}

// Service worker database instance
const swDB = new ServiceWorkerDB();

// Initialize database
swDB.initialize().catch(console.error);

// Active timeout IDs for scheduled notifications
const activeTimeouts = new Map<string, number>();

// Handle messages from main thread
self.addEventListener('message', async (event: ExtendableMessageEvent) => {
  const message: ServiceWorkerMessage = event.data;

  try {
    switch (message.type) {
      case 'SCHEDULE_NOTIFICATION': {
        await handleScheduleNotification(message.payload);
        break;
      }
      
      case 'CANCEL_NOTIFICATION': {
        await handleCancelNotification(message.payload.eventId);
        break;
      }
      
      case 'CLEAR_EXPIRED_NOTIFICATIONS': {
        const currentTime = message.payload?.currentTime 
          ? new Date(message.payload.currentTime) 
          : new Date();
        await handleClearExpiredNotifications(currentTime);
        break;
      }
    }
  } catch (error) {
    console.error('Service worker message handling error:', error);
  }
});

async function handleScheduleNotification(payload: ScheduledNotificationData): Promise<void> {
  const { eventId, eventTime, notificationTime } = payload;
  
  // Cancel existing timeout if it exists
  if (activeTimeouts.has(eventId)) {
    clearTimeout(activeTimeouts.get(eventId));
    activeTimeouts.delete(eventId);
  }

  // Save to IndexedDB
  await swDB.saveScheduledNotification(payload);

  // Schedule the notification
  const now = Date.now();
  const notificationTimeMs = new Date(notificationTime).getTime();
  const delay = notificationTimeMs - now;

  if (delay > 0) {
    const timeoutId = setTimeout(async () => {
      await showScheduledNotification(payload);
      activeTimeouts.delete(eventId);
      // Remove from IndexedDB after showing
      await swDB.removeScheduledNotification(eventId);
    }, delay);

    activeTimeouts.set(eventId, timeoutId as any);
  } else {
    // Notification time has passed, show immediately if event hasn't started
    const eventTimeMs = new Date(eventTime).getTime();
    if (eventTimeMs > now) {
      await showScheduledNotification(payload);
    }
    // Remove from IndexedDB
    await swDB.removeScheduledNotification(eventId);
  }
}

async function handleCancelNotification(eventId: string): Promise<void> {
  // Clear timeout
  if (activeTimeouts.has(eventId)) {
    clearTimeout(activeTimeouts.get(eventId));
    activeTimeouts.delete(eventId);
  }

  // Remove from IndexedDB
  await swDB.removeScheduledNotification(eventId);
}

async function handleClearExpiredNotifications(currentTime: Date): Promise<void> {
  await swDB.clearExpiredNotifications(currentTime);
}

async function showScheduledNotification(data: ScheduledNotificationData): Promise<void> {
  const { eventTitle, eventTime, eventUrl } = data;
  
  const eventTimeDate = new Date(eventTime);
  const now = new Date();
  const minutesUntilEvent = Math.round((eventTimeDate.getTime() - now.getTime()) / (1000 * 60));

  let title = `🔔 ${eventTitle}`;
  let body = '';

  if (minutesUntilEvent > 0) {
    title += ` - Starting in ${minutesUntilEvent} minute${minutesUntilEvent === 1 ? '' : 's'}`;
    body = `Your reminder for "${eventTitle}" is ready.`;
  } else {
    title += ' - Starting now!';
    body = `"${eventTitle}" is starting now.`;
  }

  // Show the notification
  const notificationOptions: ServiceWorkerNotificationOptions = {
    body,
    icon: '/favicon.svg',
    badge: '/favicon.ico',
    tag: `nostrcal-${data.eventId}`,
    requireInteraction: true,
    data: {
      eventId: data.eventId,
      eventUrl,
      eventTime,
    },
    actions: [
      {
        action: 'view',
        title: 'View Event'
      },
      {
        action: 'dismiss',
        title: 'Dismiss'
      }
    ]
  };

  await self.registration.showNotification(title, notificationOptions);
}

// Handle notification clicks
self.addEventListener('notificationclick', (event: NotificationEvent) => {
  const notification = event.notification;
  const action = event.action;
  const data = notification.data;

  notification.close();

  if (action === 'view' || !action) {
    // Open the event URL
    event.waitUntil(
      self.clients.openWindow(data.eventUrl)
    );
  }
  // Dismiss action just closes the notification (already done above)
});

// Restore scheduled notifications on service worker activation
self.addEventListener('activate', (event: ExtendableActivateEvent) => {
  event.waitUntil(restoreScheduledNotifications());
});

async function restoreScheduledNotifications(): Promise<void> {
  try {
    const pendingNotifications = await swDB.getPendingNotifications();
    
    for (const notification of pendingNotifications) {
      await handleScheduleNotification(notification);
    }
    
    console.log(`Restored ${pendingNotifications.length} scheduled notifications`);
  } catch (error) {
    console.error('Failed to restore scheduled notifications:', error);
  }
}

// Periodic cleanup of expired notifications (every 5 minutes)
setInterval(async () => {
  try {
    await handleClearExpiredNotifications(new Date());
  } catch (error) {
    console.error('Failed to clear expired notifications:', error);
  }
}, 5 * 60 * 1000);

// Handle background sync (future enhancement)
self.addEventListener('sync', (event: SyncEvent) => {
  if (event.tag === 'notification-sync') {
    event.waitUntil(restoreScheduledNotifications());
  }
});

export {}; // Make this a module