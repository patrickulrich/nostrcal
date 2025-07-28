import { useState, useEffect, useCallback, useRef } from 'react';
import { useMutation } from '@tanstack/react-query';
import {
  NotificationPreferences,
  ScheduledNotification,
  SchedulableEvent,
  isNotificationSupported,
  getNotificationPermission,
  requestNotificationPermission,
  scheduleEventNotification,
  cancelScheduledNotification,
  shouldScheduleNotification,
  loadNotificationPreferences as loadNotificationPreferencesLegacy,
  saveNotificationPreferences as saveNotificationPreferencesLegacy,
  getDefaultNotificationPreferences,
  getEventReminderTime,
  setEventReminderTime,
  getEventStartTime,
  getEventUrl,
  getEventTitle,
  calculateNotificationTime,
} from '@/utils/notifications';
import { 
  loadNotificationPreferences,
  saveNotificationPreferences
} from '@/lib/indexeddb';
import {
  scheduleNotificationInServiceWorker,
  cancelNotificationInServiceWorker
} from '@/lib/sw-messaging';
import { isAfter } from 'date-fns';
import { useToast } from '@/hooks/useToast';

/**
 * Hook to manage notification scheduling for calendar events
 */
export function useNotificationScheduler() {
  const [preferences, setPreferences] = useState<NotificationPreferences>(
    getDefaultNotificationPreferences()
  );
  const [scheduledNotifications, setScheduledNotifications] = useState<Map<string, ScheduledNotification>>(
    new Map()
  );
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermission>(
    getNotificationPermission()
  );
  
  const scheduledRef = useRef(scheduledNotifications);
  const { toast } = useToast();

  // Keep ref in sync with state
  useEffect(() => {
    scheduledRef.current = scheduledNotifications;
  }, [scheduledNotifications]);

  // Load preferences on mount (async with IndexedDB)
  useEffect(() => {
    const loadPreferences = async () => {
      try {
        const loadedPreferences = await loadNotificationPreferences();
        setPreferences(loadedPreferences);
      } catch (error) {
        console.error('Failed to load notification preferences:', error);
        // Fallback to legacy localStorage
        const legacyPreferences = loadNotificationPreferencesLegacy();
        setPreferences(legacyPreferences);
      }
    };

    loadPreferences();
  }, []);

  // Save preferences when they change (async with IndexedDB)
  useEffect(() => {
    const savePreferences = async () => {
      try {
        await saveNotificationPreferences(preferences);
      } catch (error) {
        console.error('Failed to save notification preferences:', error);
        // Fallback to legacy localStorage
        saveNotificationPreferencesLegacy(preferences);
      }
    };

    savePreferences();
  }, [preferences]);

  // Restore scheduled notifications on mount (when preferences are loaded)
  useEffect(() => {
    // Only run after preferences are loaded and we have permission
    if (!preferences.enabled || permissionStatus !== 'granted') {
      return;
    }

    // Only restore if we don't already have notifications scheduled
    if (scheduledNotifications.size > 0) {
      return;
    }

    // This will be triggered by the auto-scheduler when events load
    // We don't need to do anything here since the auto-scheduler will handle restoration
  }, [preferences.enabled, permissionStatus, scheduledNotifications.size]);

  /**
   * Request notification permission
   */
  const requestPermission = useMutation({
    mutationFn: async () => {
      const permission = await requestNotificationPermission();
      setPermissionStatus(permission);
      return permission;
    },
    onSuccess: (permission) => {
      if (permission === 'granted') {
        toast({
          title: 'Notifications Enabled',
          description: 'You will now receive calendar event reminders.',
        });
      } else {
        toast({
          title: 'Notifications Blocked',
          description: 'Please enable notifications in your browser settings to receive reminders.',
          variant: 'destructive',
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: 'Permission Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  /**
   * Update notification preferences
   */
  const updatePreferences = useCallback((updates: Partial<NotificationPreferences>) => {
    setPreferences(prev => ({
      ...prev,
      ...updates,
      enabledEventIds: updates.enabledEventIds || prev.enabledEventIds,
    }));
  }, []);

  /**
   * Toggle notifications for a specific event
   */
  const toggleEventNotification = useCallback((eventId: string, enabled: boolean) => {
    setPreferences(prev => {
      const newEnabledIds = new Set(prev.enabledEventIds);
      if (enabled) {
        newEnabledIds.add(eventId);
      } else {
        newEnabledIds.delete(eventId);
      }
      return {
        ...prev,
        enabledEventIds: newEnabledIds,
      };
    });
  }, []);

  /**
   * Set custom reminder time for a specific event
   */
  const setEventCustomReminderTime = useCallback((eventId: string, minutes: number) => {
    setPreferences(prev => setEventReminderTime(eventId, minutes, prev));
  }, []);

  /**
   * Schedule notification for a single event (using service worker)
   */
  const scheduleNotification = useCallback(async (
    event: SchedulableEvent,
    minutesBefore?: number,
    bypassEnabledCheck?: boolean
  ): Promise<boolean> => {
    
    if (!isNotificationSupported() || permissionStatus !== 'granted') {
      return false;
    }

    if (!bypassEnabledCheck && !shouldScheduleNotification(event, preferences)) {
      return false;
    }

    // When bypassing enabled check, still verify basic requirements
    if (bypassEnabledCheck) {
      if (!preferences.enabled) {
        return false;
      }
      
      const eventTime = getEventStartTime(event);
      if (!eventTime || !isAfter(eventTime, new Date())) {
        return false;
      }
    } else {
      // Regular check - verify event passes shouldScheduleNotification
      const eventTime = getEventStartTime(event);
      if (!eventTime || !isAfter(eventTime, new Date())) {
        return false;
      }
    }

    // Get event details
    const eventTime = getEventStartTime(event);
    if (!eventTime) return false;

    const reminderMinutes = minutesBefore !== undefined 
      ? minutesBefore 
      : getEventReminderTime(event.id, preferences);

    const notificationTime = calculateNotificationTime(eventTime, reminderMinutes);
    const eventTitle = getEventTitle(event);
    const eventUrl = getEventUrl(event);

    try {
      // Cancel existing notification for this event
      await cancelNotificationInServiceWorker(event.id);

      // Schedule via service worker
      await scheduleNotificationInServiceWorker(
        event.id,
        eventTitle,
        eventTime,
        notificationTime,
        reminderMinutes,
        eventUrl
      );

      // Update local state for UI tracking
      const scheduledNotification: ScheduledNotification = {
        eventId: event.id,
        eventTitle,
        eventTime,
        notificationTime,
      };

      setScheduledNotifications(prev => new Map(prev.set(event.id, scheduledNotification)));

      return true;
    } catch (error) {
      console.error('Failed to schedule notification in service worker:', error);
      
      // Fallback to legacy scheduling
      const notification = scheduleEventNotification(
        event,
        reminderMinutes,
        (notifiedEvent) => {
          setScheduledNotifications(prev => {
            const newMap = new Map(prev);
            newMap.delete(notifiedEvent.id);
            return newMap;
          });

          toast({
            title: 'Event Reminder',
            description: `${getEventTitle(notifiedEvent)} is starting soon!`,
          });
        }
      );

      if (notification) {
        setScheduledNotifications(prev => new Map(prev.set(event.id, notification)));
        return true;
      }

      return false;
    }
  }, [preferences, permissionStatus, toast]);

  /**
   * Cancel notification for a specific event
   */
  const cancelEventNotification = useCallback(async (eventId: string) => {
    try {
      await cancelNotificationInServiceWorker(eventId);
      
      setScheduledNotifications(prev => {
        const newMap = new Map(prev);
        newMap.delete(eventId);
        return newMap;
      });
    } catch (error) {
      console.error('Failed to cancel notification in service worker:', error);
      
      // Fallback to legacy cancellation
      const notification = scheduledRef.current.get(eventId);
      if (notification) {
        cancelScheduledNotification(notification);
        setScheduledNotifications(prev => {
          const newMap = new Map(prev);
          newMap.delete(eventId);
          return newMap;
        });
      }
    }
  }, []);

  /**
   * Schedule notifications for multiple events
   */
  const scheduleMultipleNotifications = useCallback(async (events: SchedulableEvent[]) => {
    let scheduledCount = 0;
    
    // Process events in parallel for better performance
    const results = await Promise.allSettled(
      events.map(event => scheduleNotification(event))
    );
    
    results.forEach((result) => {
      if (result.status === 'fulfilled' && result.value === true) {
        scheduledCount++;
      }
    });

    if (scheduledCount > 0) {
      toast({
        title: 'Notifications Scheduled',
        description: `Set up reminders for ${scheduledCount} event${scheduledCount === 1 ? '' : 's'}.`,
      });
    }

    return scheduledCount;
  }, [scheduleNotification, toast]);

  /**
   * Cancel all scheduled notifications
   */
  const cancelAllNotifications = useCallback(() => {
    scheduledRef.current.forEach(notification => {
      cancelScheduledNotification(notification);
    });
    setScheduledNotifications(new Map());
  }, []);

  /**
   * Reschedule all notifications (useful when preferences change)
   */
  const rescheduleAllNotifications = useCallback(async (events: SchedulableEvent[], silent = false) => {
    // Cancel existing notifications
    cancelAllNotifications();
    
    // Reschedule based on current preferences
    if (silent) {
      // For automatic rescheduling, don't show toast
      let scheduledCount = 0;
      
      const results = await Promise.allSettled(
        events.map(event => scheduleNotification(event))
      );
      
      results.forEach((result) => {
        if (result.status === 'fulfilled' && result.value === true) {
          scheduledCount++;
        }
      });
      
      return scheduledCount;
    } else {
      return await scheduleMultipleNotifications(events);
    }
  }, [cancelAllNotifications, scheduleMultipleNotifications, scheduleNotification]);

  /**
   * Check if event has notification enabled
   */
  const isEventNotificationEnabled = useCallback((eventId: string): boolean => {
    return preferences.enabledEventIds.has(eventId);
  }, [preferences.enabledEventIds]);

  /**
   * Check if event has scheduled notification
   */
  const isEventNotificationScheduled = useCallback((eventId: string): boolean => {
    return scheduledNotifications.has(eventId);
  }, [scheduledNotifications]);

  /**
   * Get scheduled notification info for an event
   */
  const getScheduledNotification = useCallback((eventId: string): ScheduledNotification | undefined => {
    return scheduledNotifications.get(eventId);
  }, [scheduledNotifications]);

  /**
   * Get custom reminder time for an event
   */
  const getEventCustomReminderTime = useCallback((eventId: string): number => {
    return getEventReminderTime(eventId, preferences);
  }, [preferences]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      scheduledRef.current.forEach(notification => {
        cancelScheduledNotification(notification);
      });
    };
  }, []);

  return {
    // State
    preferences,
    permissionStatus,
    scheduledNotifications,
    isSupported: isNotificationSupported(),
    
    // Actions
    requestPermission: requestPermission.mutate,
    updatePreferences,
    toggleEventNotification,
    setEventCustomReminderTime,
    scheduleNotification,
    cancelEventNotification,
    scheduleMultipleNotifications,
    cancelAllNotifications,
    rescheduleAllNotifications,
    
    // Helpers
    isEventNotificationEnabled,
    isEventNotificationScheduled,
    getScheduledNotification,
    getEventCustomReminderTime,
    
    // Status
    isRequestingPermission: requestPermission.isPending,
  };
}

/**
 * Hook to automatically manage notifications for calendar events
 * This hook should be used at the app level to continuously manage notifications
 */
export function useAutoNotifications(events: SchedulableEvent[] = []) {
  const scheduler = useNotificationScheduler();

  // Auto-schedule notifications when events change
  useEffect(() => {
    // Only auto-schedule if notifications are enabled and we have permission
    if (!scheduler.preferences.enabled || scheduler.permissionStatus !== 'granted') {
      return;
    }

    // Skip if no events have notifications enabled
    if (scheduler.preferences.enabledEventIds.size === 0) {
      return;
    }

    // Wait for events to load
    if (events.length === 0) {
      return;
    }

    // Filter to only events that have notifications enabled
    const eventsToSchedule = events.filter(event => 
      scheduler.preferences.enabledEventIds.has(event.id)
    );

    if (eventsToSchedule.length > 0) {
      // Check which events don't have active notifications scheduled
      const unscheduledEvents = eventsToSchedule.filter(event => 
        !scheduler.scheduledNotifications.has(event.id)
      );
      
      if (unscheduledEvents.length > 0) {
        // Schedule notifications for unscheduled events (async)
        const scheduleUnscheduledEvents = async () => {
          await Promise.allSettled(
            unscheduledEvents.map(event => 
              scheduler.scheduleNotification(event, undefined, true) // Bypass enabled check
            )
          );
        };
        
        scheduleUnscheduledEvents().catch(console.error);
      }
    }
  }, [
    events,
    scheduler
  ]);

  return scheduler;
}