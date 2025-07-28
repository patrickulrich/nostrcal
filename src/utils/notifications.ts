/**
 * Browser notification utilities for calendar events
 */

import { NostrEvent } from '@nostrify/nostrify';
import { parseISO, isAfter, differenceInMinutes, format } from 'date-fns';
import { nip19 } from 'nostr-tools';

// Type for events that can be scheduled (includes both NostrEvent and Rumor)
export type SchedulableEvent = NostrEvent | {
  id: string;
  kind: number;
  pubkey: string;
  created_at: number;
  tags: string[][];
  content: string;
};

export interface NotificationPreferences {
  enabled: boolean;
  defaultMinutesBefore: number; // Default reminder time in minutes
  enabledEventIds: Set<string>; // Set of event IDs with notifications enabled
  customReminderTimes: Map<string, number>; // Per-event custom reminder times in minutes
}

export interface ScheduledNotification {
  eventId: string;
  eventTitle: string;
  eventTime: Date;
  notificationTime: Date;
  timeoutId?: number;
}

/**
 * Check if browser notifications are supported
 */
export function isNotificationSupported(): boolean {
  return 'Notification' in window;
}

/**
 * Get current notification permission status
 */
export function getNotificationPermission(): NotificationPermission {
  if (!isNotificationSupported()) {
    return 'denied';
  }
  return Notification.permission;
}

/**
 * Request notification permission from user
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!isNotificationSupported()) {
    throw new Error('Notifications are not supported in this browser');
  }

  if (Notification.permission === 'granted') {
    return 'granted';
  }

  if (Notification.permission === 'denied') {
    throw new Error('Notifications have been blocked. Please enable them in your browser settings.');
  }

  // Request permission
  const permission = await Notification.requestPermission();
  return permission;
}

/**
 * Show a browser notification
 */
export function showNotification(title: string, options?: NotificationOptions): Notification | null {
  if (!isNotificationSupported() || Notification.permission !== 'granted') {
    return null;
  }

  const notification = new Notification(title, {
    icon: '/icon-192x192.png', // You'll need to add an icon to your public folder
    badge: '/icon-192x192.png',
    tag: 'nostrcal-event', // Prevents duplicate notifications
    ...options,
  });

  // Auto-close after 30 seconds (longer for action buttons)
  setTimeout(() => notification.close(), 30000);

  return notification;
}

/**
 * Parse calendar event start time
 */
export function getEventStartTime(event: SchedulableEvent): Date | null {
  // RSVP events (kind 31925) may have inherited start time from referenced event
  if (event.kind === 31925 && (event as any).start) {
    const start = (event as any).start;
    // Handle both timestamp and ISO string formats
    if (typeof start === 'string') {
      if (start.includes('T') || start.includes('-')) {
        // ISO date string
        return parseISO(start);
      } else {
        // Unix timestamp as string
        const timestamp = parseInt(start);
        return isNaN(timestamp) ? null : new Date(timestamp * 1000);
      }
    } else if (typeof start === 'number') {
      // Unix timestamp
      return new Date(start * 1000);
    }
  }

  const startTag = event.tags.find(tag => tag[0] === 'start');
  if (!startTag || !startTag[1]) return null;

  // Handle date-based events (kind 31922)
  if (event.kind === 31922) {
    return parseISO(startTag[1] + 'T00:00:00');
  }

  // Handle time-based events (kind 31923)
  if (event.kind === 31923) {
    const timestamp = parseInt(startTag[1]);
    if (isNaN(timestamp)) return null;
    return new Date(timestamp * 1000);
  }

  return null;
}

/**
 * Get event title from tags
 */
export function getEventTitle(event: SchedulableEvent): string {
  const titleTag = event.tags.find(tag => tag[0] === 'title');
  return titleTag?.[1] || 'Calendar Event';
}

/**
 * Get event location from tags
 */
export function getEventLocation(event: SchedulableEvent): string | null {
  const locationTag = event.tags.find(tag => tag[0] === 'location');
  return locationTag?.[1] || null;
}

/**
 * Get event URL for deep linking
 */
export function getEventUrl(event: SchedulableEvent): string {
  // Check if this is a private event (has source property and is private)
  const isPrivateEvent = (event as any).source === 'private' ||
                         (event as any).source === 'privateDayEvents' ||
                         (event as any).source === 'privateTimeEvents' ||
                         (event as any).source === 'privateRsvps';
  
  // Private events should always use /calendar/{id} URLs since they don't have public naddr
  if (isPrivateEvent) {
    return `/calendar/${event.id}`;
  }
  
  // Extract d-tag from event tags for public events
  const dTag = event.tags.find(tag => tag[0] === 'd')?.[1];
  
  // Public calendar events (31922-31927) should use naddr for proper deep linking
  if (dTag && event.pubkey && event.kind >= 31922 && event.kind <= 31927) {
    try {
      const naddr = nip19.naddrEncode({
        identifier: dTag,
        pubkey: event.pubkey,
        kind: event.kind,
      });
      return `/events/${naddr}`;
    } catch (error) {
      console.error('Failed to generate naddr for event:', error);
      // Fall back to simple ID-based URL
      return `/calendar/${event.id}`;
    }
  }
  
  // For non-calendar events or if naddr encoding fails, use simple URL
  return `/calendar/${event.id}`;
}

/**
 * Navigate to event URL (for deep linking)
 */
export function navigateToEvent(eventUrl: string): void {
  // Check if we can use the history API (app is running)
  if (typeof window !== 'undefined' && window.location) {
    window.location.href = eventUrl;
  }
}

/**
 * Snooze notification - reschedule for later
 */
export function snoozeNotification(
  event: SchedulableEvent, 
  snoozeMinutes: number = 5,
  onNotificationShown?: (event: SchedulableEvent) => void
): ScheduledNotification | null {
  
  // Schedule a new notification in snoozeMinutes
  const now = new Date();
  const snoozeTime = new Date(now.getTime() + snoozeMinutes * 60 * 1000);
  
  const eventTitle = getEventTitle(event);
  const eventUrl = getEventUrl(event);
  
  const timeoutId = window.setTimeout(() => {
    const notification = showNotification(`⏰ Snoozed Reminder: ${eventTitle}`, {
      body: `Your snoozed reminder for "${eventTitle}" is ready.`,
      requireInteraction: true,
      data: { eventId: event.id, eventUrl, action: 'snooze' },
    });

    if (notification) {
      // Add click handler for deep linking
      notification.addEventListener('click', () => {
        window.focus(); // Bring browser window to focus
        navigateToEvent(eventUrl);
        notification.close();
      });

      if (onNotificationShown) {
        onNotificationShown(event);
      }
    }
  }, snoozeMinutes * 60 * 1000);

  return {
    eventId: event.id,
    eventTitle: `${eventTitle} (Snoozed)`,
    eventTime: snoozeTime,
    notificationTime: snoozeTime,
    timeoutId,
  };
}

/**
 * Calculate notification time based on event time and minutes before
 */
export function calculateNotificationTime(eventTime: Date, minutesBefore: number): Date {
  return new Date(eventTime.getTime() - minutesBefore * 60 * 1000);
}

/**
 * Check if we should schedule a notification for this event
 */
export function shouldScheduleNotification(
  event: SchedulableEvent,
  preferences: NotificationPreferences
): boolean {
  if (!preferences.enabled) return false;
  if (!preferences.enabledEventIds.has(event.id)) return false;

  const eventTime = getEventStartTime(event);
  if (!eventTime) return false;

  // Don't schedule notifications for past events
  if (!isAfter(eventTime, new Date())) return false;

  return true;
}

/**
 * Format notification body text
 */
export function formatNotificationBody(event: SchedulableEvent, eventTime: Date): string {
  const location = getEventLocation(event);
  const timeStr = format(eventTime, 'h:mm a');
  
  let body = `Starting at ${timeStr}`;
  if (location) {
    body += `\n📍 ${location}`;
  }

  // Add summary if available
  const summaryTag = event.tags.find(tag => tag[0] === 'summary');
  if (summaryTag?.[1]) {
    body += `\n\n${summaryTag[1]}`;
  }

  return body;
}

/**
 * Schedule a notification for a calendar event
 */
export function scheduleEventNotification(
  event: SchedulableEvent,
  minutesBefore: number,
  onNotificationShown?: (event: SchedulableEvent) => void,
  onSnooze?: (event: SchedulableEvent, snoozeNotification: ScheduledNotification) => void
): ScheduledNotification | null {
  const eventTime = getEventStartTime(event);
  if (!eventTime) return null;

  const notificationTime = calculateNotificationTime(eventTime, minutesBefore);
  const now = new Date();

  // Check if notification time has already passed
  if (!isAfter(notificationTime, now)) {
    return null;
  }

  const msUntilNotification = notificationTime.getTime() - now.getTime();
  const eventTitle = getEventTitle(event);
  const eventUrl = getEventUrl(event);

  // Schedule the notification
  const timeoutId = window.setTimeout(() => {
    const minutesUntilEvent = differenceInMinutes(eventTime, new Date());
    let title = eventTitle;
    
    if (minutesUntilEvent > 0) {
      title = `🔔 ${eventTitle} - Starting in ${minutesUntilEvent} minutes`;
    } else {
      title = `🔔 ${eventTitle} - Starting now!`;
    }

    const notification = showNotification(title, {
      body: formatNotificationBody(event, eventTime),
      requireInteraction: true, // Keep notification visible until user interacts
      data: { 
        eventId: event.id, 
        eventUrl,
        action: 'reminder',
        canSnooze: minutesUntilEvent > 0 // Only allow snooze if event hasn't started
      }
    });

    if (notification) {
      // Handle notification click (deep linking)
      notification.addEventListener('click', () => {
        window.focus(); // Bring browser window to focus
        navigateToEvent(eventUrl);
        notification.close();
      });

      // Handle action button clicks (limited browser support)
      notification.addEventListener('notificationclick', (e: any) => {
        e.notification.close();
        
        if (e.action === 'view') {
          window.focus();
          navigateToEvent(eventUrl);
        } else if (e.action === 'snooze' && onSnooze) {
          const snoozeNotif = snoozeNotification(event, 5, onNotificationShown);
          if (snoozeNotif) {
            onSnooze(event, snoozeNotif);
          }
        }
      });

      if (onNotificationShown) {
        onNotificationShown(event);
      }
    }
  }, msUntilNotification);

  return {
    eventId: event.id,
    eventTitle,
    eventTime,
    notificationTime,
    timeoutId,
  };
}

/**
 * Cancel a scheduled notification
 */
export function cancelScheduledNotification(notification: ScheduledNotification): void {
  if (notification.timeoutId !== undefined) {
    window.clearTimeout(notification.timeoutId);
  }
}

/**
 * Get default notification preferences
 */
export function getDefaultNotificationPreferences(): NotificationPreferences {
  return {
    enabled: false,
    defaultMinutesBefore: 15, // 15 minutes before by default
    enabledEventIds: new Set(),
    customReminderTimes: new Map(),
  };
}

/**
 * Save notification preferences (migrated to IndexedDB)
 * @deprecated Use IndexedDB functions from @/lib/indexeddb instead
 */
export function saveNotificationPreferences(preferences: NotificationPreferences): void {
  // Synchronous wrapper for backward compatibility
  import('@/lib/indexeddb').then(({ saveNotificationPreferences: saveToIDB }) => {
    saveToIDB(preferences).catch(console.error);
  });
  
  // Also save to localStorage as backup for now
  const serialized = {
    ...preferences,
    enabledEventIds: Array.from(preferences.enabledEventIds),
    customReminderTimes: Array.from(preferences.customReminderTimes.entries()),
  };
  localStorage.setItem('nostrcal_notification_preferences', JSON.stringify(serialized));
}

/**
 * Load notification preferences (migrated to IndexedDB)
 * @deprecated Use IndexedDB functions from @/lib/indexeddb instead
 */
export function loadNotificationPreferences(): NotificationPreferences {
  // For backward compatibility, still read from localStorage first
  const stored = localStorage.getItem('nostrcal_notification_preferences');
  if (!stored) {
    return getDefaultNotificationPreferences();
  }

  try {
    const parsed = JSON.parse(stored);
    const preferences = {
      ...parsed,
      enabledEventIds: new Set(parsed.enabledEventIds || []),
      customReminderTimes: new Map(parsed.customReminderTimes || []),
    };
    return preferences;
  } catch {
    return getDefaultNotificationPreferences();
  }
}

/**
 * Get custom reminder time for an event, or default if not set
 */
export function getEventReminderTime(
  eventId: string,
  preferences: NotificationPreferences
): number {
  return preferences.customReminderTimes.get(eventId) || preferences.defaultMinutesBefore;
}

/**
 * Set custom reminder time for an event
 */
export function setEventReminderTime(
  eventId: string,
  minutes: number,
  preferences: NotificationPreferences
): NotificationPreferences {
  const newCustomTimes = new Map(preferences.customReminderTimes);
  
  if (minutes === preferences.defaultMinutesBefore) {
    // If setting to default, remove the custom time
    newCustomTimes.delete(eventId);
  } else {
    // Set custom time
    newCustomTimes.set(eventId, minutes);
  }
  
  return {
    ...preferences,
    customReminderTimes: newCustomTimes,
  };
}