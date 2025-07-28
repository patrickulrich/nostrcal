import { useEffect } from 'react';
import { useCalendarEvents } from '@/hooks/useCalendarEvents';
import { usePrivateCalendarEvents } from '@/hooks/usePrivateCalendarEvents';
import { useAutoNotifications } from '@/hooks/useNotificationScheduler';
import { useNotificationEvents } from '@/hooks/useNotificationEvents';

/**
 * Hook to get notification status for the current user
 * Useful for showing notification indicators in the UI
 */
export function useNotificationStatus() {
  const { data: publicEvents = [] } = useCalendarEvents();
  const { privateEvents = [] } = usePrivateCalendarEvents();
  const { events: notificationEvents = [] } = useNotificationEvents();
  
  // Deduplicate events by ID to prevent duplicate notifications
  // Include notification-specific events that might not be in the user's calendar
  const allEventsMap = new Map();
  [...publicEvents, ...privateEvents, ...notificationEvents].forEach(event => {
    allEventsMap.set(event.id, event);
  });
  const allEvents = Array.from(allEventsMap.values());
  
  const scheduler = useAutoNotifications(allEvents);
  
  // Force immediate restoration when events first load
  useEffect(() => {
    if (allEvents.length > 0 && 
        scheduler.preferences.enabled && 
        scheduler.permissionStatus === 'granted' &&
        scheduler.preferences.enabledEventIds.size > 0 &&
        scheduler.scheduledNotifications.size === 0) {
      
      // Trigger immediate restoration
      const eventsToSchedule = allEvents.filter(event => 
        scheduler.preferences.enabledEventIds.has(event.id)
      );
      
      if (eventsToSchedule.length > 0) {
        eventsToSchedule.forEach(event => {
          scheduler.scheduleNotification(event, undefined, true);
        });
      }
    }
  }, [allEvents, scheduler]);
  
  // Basic debug logging - only when events finish loading
  const hasEvents = allEvents.length > 0;
  const finishedLoading = hasEvents && scheduler.preferences.enabledEventIds.size >= 0;
  
  if (finishedLoading && allEvents.length % 10 === 0) { // Log every 10 events to reduce spam
  }

  const enabledEvents = allEvents.filter(event => 
    scheduler.isEventNotificationEnabled(event.id)
  );
  
  // Clean up stale notification data - only after events finish loading
  if (allEvents.length > 50) { // Only run cleanup once events have mostly loaded
    const currentEventIds = new Set(allEvents.map(e => e.id));
    let needsUpdate = false;
    const updatedPreferences = { ...scheduler.preferences };
    
    // Clean up enabled event IDs that don't correspond to existing events
    const staleEnabledIds = Array.from(scheduler.preferences.enabledEventIds).filter(
      id => !currentEventIds.has(id)
    );
    
    if (staleEnabledIds.length > 0) {
      const cleanedEnabledIds = new Set(scheduler.preferences.enabledEventIds);
      staleEnabledIds.forEach(id => cleanedEnabledIds.delete(id));
      updatedPreferences.enabledEventIds = cleanedEnabledIds;
      needsUpdate = true;
    }
    
    // Clean up orphaned custom reminder times (for events no longer enabled)
    const orphanedReminderIds = Array.from(scheduler.preferences.customReminderTimes.keys()).filter(
      id => !scheduler.preferences.enabledEventIds.has(id)
    );
    
    if (orphanedReminderIds.length > 0) {
      const cleanedReminderTimes = new Map(scheduler.preferences.customReminderTimes);
      orphanedReminderIds.forEach(id => cleanedReminderTimes.delete(id));
      updatedPreferences.customReminderTimes = cleanedReminderTimes;
      needsUpdate = true;
    }
    
    // Apply all preference updates at once to avoid multiple saves
    if (needsUpdate) {
      scheduler.updatePreferences(updatedPreferences);
    }
  }
  
  
  const stats = {
    totalEvents: allEvents.length,
    eventsWithNotifications: enabledEvents.length,
    activeNotifications: scheduler.scheduledNotifications.size,
    isEnabled: scheduler.preferences.enabled,
    permissionStatus: scheduler.permissionStatus,
    isSupported: scheduler.isSupported,
  };

  return {
    ...scheduler,
    stats,
  };
}