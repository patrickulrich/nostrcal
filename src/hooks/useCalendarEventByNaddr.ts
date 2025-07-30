import { useQuery } from '@tanstack/react-query';
import { useNostr } from '@nostrify/react';
import { nip19 } from 'nostr-tools';
import { CalendarEvent } from '@/contexts/EventsContextTypes';
import { useNIP65RelayRouting } from '@/hooks/useNIP65RelayRouting';

// Transform NostrEvent to CalendarEvent (reusing logic from useCalendarEvents)
function transformEventForCalendar(event: any): CalendarEvent {
  const dTag = event.tags.find((tag: string[]) => tag[0] === 'd')?.[1];
  let title = event.tags.find((tag: string[]) => tag[0] === 'title')?.[1];
  
  // Special handling for busy time blocks (kind 31927)
  if (event.kind === 31927) {
    title = 'Booking Block';
  }
  
  const summary = event.tags.find((tag: string[]) => tag[0] === 'summary')?.[1];
  const image = event.tags.find((tag: string[]) => tag[0] === 'image')?.[1];
  const start = event.tags.find((tag: string[]) => tag[0] === 'start')?.[1];
  const end = event.tags.find((tag: string[]) => tag[0] === 'end')?.[1];
  const location = event.tags.find((tag: string[]) => tag[0] === 'location')?.[1];
  const geohash = event.tags.find((tag: string[]) => tag[0] === 'g')?.[1];
  const timezone = event.tags.find((tag: string[]) => tag[0] === 'start_tzid')?.[1] || 
                   event.tags.find((tag: string[]) => tag[0] === 'timezone')?.[1];
  const endTimezone = event.tags.find((tag: string[]) => tag[0] === 'end_tzid')?.[1];
  
  const participants = event.tags
    .filter((tag: string[]) => tag[0] === 'p')
    .map((tag: string[]) => tag[1]);
    
  const hashtags = event.tags
    .filter((tag: string[]) => tag[0] === 't')
    .map((tag: string[]) => tag[1]);
    
  const references = event.tags
    .filter((tag: string[]) => tag[0] === 'r')
    .map((tag: string[]) => tag[1]);

  return {
    id: event.id,
    kind: event.kind,
    pubkey: event.pubkey,
    created_at: event.created_at,
    tags: event.tags,
    content: event.content,
    sig: event.sig || '',
    dTag,
    title,
    summary,
    image,
    start,
    end,
    location,
    geohash,
    description: event.content,
    timezone,
    endTimezone,
    hashtags,
    references,
    participants,
    rawEvent: event
  };
}

// Validate calendar event according to NIP-52
function validateCalendarEvent(event: any): boolean {
  // Check if it's a calendar event kind
  if (![31922, 31923, 31924, 31925, 31926, 31927].includes(event.kind)) return false;

  // Check for required tags according to NIP-52
  const d = event.tags.find(([name]: string[]) => name === 'd')?.[1];
  const title = event.tags.find(([name]: string[]) => name === 'title')?.[1];
  
  // All calendar events require 'd' tag
  if (!d) return false;

  // Date-based events (31922) require title and start
  if (event.kind === 31922) {
    const start = event.tags.find(([name]: string[]) => name === 'start')?.[1];
    if (!title || !start) return false;
    
    // start tag should be in YYYY-MM-DD format for date-based events
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(start)) return false;
  }

  // Time-based events (31923) require title and start
  if (event.kind === 31923) {
    const start = event.tags.find(([name]: string[]) => name === 'start')?.[1];
    if (!title || !start) return false;
    
    // start tag should be a unix timestamp for time-based events
    const timestamp = parseInt(start);
    if (isNaN(timestamp) || timestamp <= 0) return false;
  }

  // Calendar collections (31924) require title
  if (event.kind === 31924) {
    if (!title) return false;
  }

  // RSVPs (31925) require status
  if (event.kind === 31925) {
    const status = event.tags.find(([name]: string[]) => name === 'status')?.[1];
    if (!status || !['accepted', 'declined', 'tentative'].includes(status)) return false;
  }

  // Availability templates (31926) require title
  if (event.kind === 31926) {
    if (!title) return false;
  }

  // Availability blocks (31927) require start and end
  if (event.kind === 31927) {
    const start = event.tags.find(([name]: string[]) => name === 'start')?.[1];
    const end = event.tags.find(([name]: string[]) => name === 'end')?.[1];
    if (!start || !end) return false;
    
    const startTime = parseInt(start);
    const endTime = parseInt(end);
    if (isNaN(startTime) || isNaN(endTime) || startTime >= endTime) return false;
  }

  return true;
}

export function useCalendarEventByNaddr(naddr: string) {
  const { nostr } = useNostr();
  const { getRelaysForAuthor } = useNIP65RelayRouting();

  return useQuery({
    queryKey: ['calendar-event-by-naddr', naddr],
    queryFn: async (c) => {
      
      if (!naddr) return null;

      let decoded;
      try {
        decoded = nip19.decode(naddr);
      } catch {
        throw new Error('Invalid naddr format');
      }

      if (decoded.type !== 'naddr') {
        throw new Error('Not an naddr identifier');
      }

      const { kind, pubkey, identifier } = decoded.data;
      const relays = (decoded.data as any).relays;
      
      
      // Check if it's a calendar event kind
      if (![31922, 31923, 31924, 31925, 31926, 31927].includes(kind)) {
        throw new Error('Not a calendar event');
      }

      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(10000)]);
      
      const filter = {
        kinds: [kind],
        authors: [pubkey],
        '#d': [identifier],
        limit: 1
      };
      
      let events: any[] = [];
      
      // Strategy 1: Try relay hints from naddr first
      if (relays && relays.length > 0) {
        try {
          events = await nostr.query([filter], { signal, relays });
        } catch {
          // Ignore query errors and continue to next strategy
        }
      }
      
      // Strategy 2: If no events found, try NIP-65 author relays as fallback
      if (events.length === 0) {
        try {
          const authorRelays = await getRelaysForAuthor(pubkey);
          
          if (authorRelays.length > 0) {
            events = await nostr.query([filter], { signal, relays: authorRelays });
          }
        } catch {
          // Ignore query errors and continue to next strategy
        }
      }
      
      // Strategy 3: Final fallback to default relays (no relay restriction)
      if (events.length === 0) {
        try {
          events = await nostr.query([filter], { signal });
        } catch {
          // Ignore query errors and continue to next strategy
        }
      }

      if (events.length === 0) {
        throw new Error('Event not found');
      }

      const event = events[0];
      
      if (!validateCalendarEvent(event)) {
        throw new Error('Invalid calendar event');
      }

      const transformed = transformEventForCalendar(event);
      return transformed;
    },
    enabled: !!naddr,
    staleTime: 60 * 1000, // 1 minute
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}