import { useState, useEffect } from 'react';
import { useNostr } from '@nostrify/react';
import { CalendarEvent } from '@/contexts/EventsContextTypes';
import { loadNotificationPreferences } from '@/utils/notifications';

/**
 * Hook to load specific events that have notifications enabled
 * This avoids loading all public events unnecessarily
 */
// Transform NostrEvent to CalendarEvent
function transformEventForCalendar(event: any): CalendarEvent {
  const dTag = event.tags.find((tag: string[]) => tag[0] === 'd')?.[1];
  const title = event.tags.find((tag: string[]) => tag[0] === 'title')?.[1];
  const start = event.tags.find((tag: string[]) => tag[0] === 'start')?.[1];
  const end = event.tags.find((tag: string[]) => tag[0] === 'end')?.[1];
  const location = event.tags.find((tag: string[]) => tag[0] === 'location')?.[1];
  
  return {
    id: event.id,
    kind: event.kind,
    pubkey: event.pubkey,
    created_at: event.created_at,
    tags: event.tags,
    content: event.content,
    sig: event.sig,
    dTag,
    title,
    start,
    end,
    location,
    description: event.content,
    source: 'notification',
    rawEvent: event
  };
}

export function useNotificationEvents() {
  const { nostr } = useNostr();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const loadEnabledEvents = async () => {
      // Load notification preferences to get enabled event IDs
      const preferences = loadNotificationPreferences();
      const enabledEventIds = Array.from(preferences.enabledEventIds);
      
      if (enabledEventIds.length === 0 || !nostr) {
        setEvents([]);
        return;
      }

      setIsLoading(true);
      
      try {
        // Query for specific events by ID
        const signal = AbortSignal.timeout(5000);
        const queriedEvents = await nostr.query([
          {
            ids: enabledEventIds,
            kinds: [31922, 31923, 31924, 31925, 31926, 31927],
          }
        ], { signal });
        
        // Transform to CalendarEvent format
        const transformedEvents = queriedEvents.map(transformEventForCalendar);
        setEvents(transformedEvents);
      } catch (error) {
        console.error('Failed to load notification events:', error);
        setEvents([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadEnabledEvents();
  }, [nostr]);

  return { events, isLoading };
}