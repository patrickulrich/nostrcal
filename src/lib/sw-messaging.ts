/**
 * Service Worker messaging utilities
 * Handles communication between main thread and service worker
 */

export interface ServiceWorkerMessage {
  type: string;
  payload?: any;
}

export interface ScheduleNotificationMessage extends ServiceWorkerMessage {
  type: 'SCHEDULE_NOTIFICATION';
  payload: {
    eventId: string;
    eventTitle: string;
    eventTime: string; // ISO string
    notificationTime: string; // ISO string
    reminderMinutes: number;
    eventUrl: string;
  };
}

export interface CancelNotificationMessage extends ServiceWorkerMessage {
  type: 'CANCEL_NOTIFICATION';
  payload: {
    eventId: string;
  };
}

export interface ClearExpiredMessage extends ServiceWorkerMessage {
  type: 'CLEAR_EXPIRED_NOTIFICATIONS';
  payload?: {
    currentTime?: string; // ISO string
  };
}

export type NotificationMessage = 
  | ScheduleNotificationMessage 
  | CancelNotificationMessage 
  | ClearExpiredMessage;

class ServiceWorkerMessenger {
  private registration: ServiceWorkerRegistration | null = null;

  async initialize(): Promise<void> {
    if (!('serviceWorker' in navigator)) {
      throw new Error('Service Workers not supported');
    }

    try {
      this.registration = await navigator.serviceWorker.ready;
    } catch (error) {
      console.error('Failed to get service worker registration:', error);
      throw error;
    }
  }

  private async ensureRegistration(): Promise<ServiceWorkerRegistration> {
    if (!this.registration) {
      await this.initialize();
    }
    if (!this.registration) {
      throw new Error('Service Worker not available');
    }
    return this.registration;
  }

  async sendMessage(message: ServiceWorkerMessage): Promise<void> {
    const registration = await this.ensureRegistration();
    
    // Wait for service worker to be active (max 5 seconds)
    if (!registration.active) {
      await new Promise<void>((resolve, reject) => {
        let attempts = 0;
        const maxAttempts = 50; // 5 seconds with 100ms intervals
        
        const checkActive = () => {
          if (registration.active) {
            resolve();
          } else if (attempts >= maxAttempts) {
            reject(new Error('Service Worker failed to activate within 5 seconds'));
          } else {
            attempts++;
            setTimeout(checkActive, 100);
          }
        };
        checkActive();
      });
    }
    
    if (registration.active) {
      registration.active.postMessage(message);
    } else {
      console.warn('Service Worker not active after waiting, message not sent:', message);
    }
  }

  async scheduleNotification(
    eventId: string,
    eventTitle: string,
    eventTime: Date,
    notificationTime: Date,
    reminderMinutes: number,
    eventUrl: string
  ): Promise<void> {
    const message: ScheduleNotificationMessage = {
      type: 'SCHEDULE_NOTIFICATION',
      payload: {
        eventId,
        eventTitle,
        eventTime: eventTime.toISOString(),
        notificationTime: notificationTime.toISOString(),
        reminderMinutes,
        eventUrl,
      },
    };

    await this.sendMessage(message);
  }

  async cancelNotification(eventId: string): Promise<void> {
    const message: CancelNotificationMessage = {
      type: 'CANCEL_NOTIFICATION',
      payload: { eventId },
    };

    await this.sendMessage(message);
  }

  async clearExpiredNotifications(currentTime?: Date): Promise<void> {
    const message: ClearExpiredMessage = {
      type: 'CLEAR_EXPIRED_NOTIFICATIONS',
      payload: currentTime ? { currentTime: currentTime.toISOString() } : {},
    };

    await this.sendMessage(message);
  }

  // Listen for messages from service worker
  onMessage(callback: (message: ServiceWorkerMessage) => void): () => void {
    const handler = (event: MessageEvent) => {
      if (event.data && typeof event.data === 'object' && event.data.type) {
        callback(event.data as ServiceWorkerMessage);
      }
    };

    navigator.serviceWorker.addEventListener('message', handler);

    // Return cleanup function
    return () => {
      navigator.serviceWorker.removeEventListener('message', handler);
    };
  }
}

// Create singleton instance
const swMessenger = new ServiceWorkerMessenger();

// Initialize on module load
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  swMessenger.initialize().catch(console.error);
}

export { swMessenger };

// Export utility functions
export async function scheduleNotificationInServiceWorker(
  eventId: string,
  eventTitle: string,
  eventTime: Date,
  notificationTime: Date,
  reminderMinutes: number,
  eventUrl: string
): Promise<void> {
  return swMessenger.scheduleNotification(
    eventId,
    eventTitle,
    eventTime,
    notificationTime,
    reminderMinutes,
    eventUrl
  );
}

export async function cancelNotificationInServiceWorker(eventId: string): Promise<void> {
  return swMessenger.cancelNotification(eventId);
}

export async function clearExpiredNotificationsInServiceWorker(currentTime?: Date): Promise<void> {
  return swMessenger.clearExpiredNotifications(currentTime);
}

export function onServiceWorkerMessage(callback: (message: ServiceWorkerMessage) => void): () => void {
  return swMessenger.onMessage(callback);
}