import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNostr } from '@nostrify/react';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { usePrivateCalendarEvents } from '@/hooks/usePrivateCalendarEvents';
import { useRSVPReferencedEvents } from '@/hooks/useRSVPReferencedEvents';
import { NostrEvent } from '@nostrify/nostrify';
import { Rumor } from '@/utils/nip59';
import { CalendarEvent } from '@/contexts/EventsContextTypes';

// Transform NostrEvent or Rumor to CalendarEvent
function transformEventForCalendar(event: NostrEvent | Rumor): CalendarEvent {
  const dTag = event.tags.find(tag => tag[0] === 'd')?.[1];
  let title = event.tags.find(tag => tag[0] === 'title')?.[1];
  
  // Special handling for busy time blocks (kind 31927)
  if (event.kind === 31927) {
    title = 'Booking Block';
  }
  
  const summary = event.tags.find(tag => tag[0] === 'summary')?.[1];
  const image = event.tags.find(tag => tag[0] === 'image')?.[1];
  const start = event.tags.find(tag => tag[0] === 'start')?.[1];
  const end = event.tags.find(tag => tag[0] === 'end')?.[1];
  const location = event.tags.find(tag => tag[0] === 'location')?.[1];
  const geohash = event.tags.find(tag => tag[0] === 'g')?.[1];
  const timezone = event.tags.find(tag => tag[0] === 'start_tzid')?.[1] || 
                   event.tags.find(tag => tag[0] === 'timezone')?.[1];
  const endTimezone = event.tags.find(tag => tag[0] === 'end_tzid')?.[1];
  
  const participants = event.tags
    .filter(tag => tag[0] === 'p')
    .map(tag => tag[1]);
    
  const hashtags = event.tags
    .filter(tag => tag[0] === 't')
    .map(tag => tag[1]);
    
  const references = event.tags
    .filter(tag => tag[0] === 'r')
    .map(tag => tag[1]);

  // RSVP-specific handling
  let rsvpData: {
    needsTimeFromReference?: boolean;
    referenceCoordinate?: string;
    rsvpStatus?: string;
  } = {};

  // Special handling for RSVP events (kind 31925)
  if (event.kind === 31925) {
    const status = event.tags.find(tag => tag[0] === 'status')?.[1];
    const coordinate = event.tags.find(tag => tag[0] === 'a')?.[1];
    
    const eventInfo = coordinate ? coordinate.split(':')[2] || 'Event' : 'Event';
    title = title || `RSVP: ${eventInfo} (${status || 'pending'})`;

    rsvpData = {
      needsTimeFromReference: true,
      referenceCoordinate: coordinate,
      rsvpStatus: status
    };
  }

  return {
    id: event.id,
    kind: event.kind,
    pubkey: event.pubkey,
    created_at: event.created_at,
    tags: event.tags,
    content: event.content,
    sig: 'sig' in event ? event.sig : '',
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
    ...rsvpData,
    rawEvent: 'sig' in event ? event : undefined
  };
}

// Validate calendar event according to NIP-52
function validateCalendarEvent(event: NostrEvent | Rumor): boolean {
  // Check if it's a calendar event kind
  if (![31922, 31923, 31924, 31925, 31926, 31927].includes(event.kind)) return false;

  // Check for required tags according to NIP-52
  const d = event.tags.find(([name]) => name === 'd')?.[1];
  const title = event.tags.find(([name]) => name === 'title')?.[1];
  
  // All calendar events require 'd' tag
  if (!d) return false;

  // Date-based events (31922) require title and start
  if (event.kind === 31922) {
    const start = event.tags.find(([name]) => name === 'start')?.[1];
    if (!title || !start) return false;
    
    // start tag should be in YYYY-MM-DD format for date-based events
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(start)) return false;
  }

  // Time-based events (31923) require title and start
  if (event.kind === 31923) {
    const start = event.tags.find(([name]) => name === 'start')?.[1];
    if (!title || !start) return false;
    
    // start tag should be a unix timestamp for time-based events
    // but some private events might have ISO date strings
    const timestamp = parseInt(start);
    if (!isNaN(timestamp) && timestamp > 0) {
      // Valid Unix timestamp
      return true;
    } else if (typeof start === 'string' && start.includes('T')) {
      // Might be ISO date string, try to parse it
      const date = new Date(start);
      return !isNaN(date.getTime());
    }
    return false;
  }

  // Calendar collections (31924) require title
  if (event.kind === 31924) {
    if (!title) return false;
  }

  // RSVPs (31925) require status
  if (event.kind === 31925) {
    const status = event.tags.find(([name]) => name === 'status')?.[1];
    if (!status || !['accepted', 'declined', 'tentative'].includes(status)) return false;
  }

  // Availability templates (31926) require title
  if (event.kind === 31926) {
    if (!title) return false;
  }

  // Availability blocks (31927) require start and end
  if (event.kind === 31927) {
    const start = event.tags.find(([name]) => name === 'start')?.[1];
    const end = event.tags.find(([name]) => name === 'end')?.[1];
    if (!start || !end) return false;
    
    const startTime = parseInt(start);
    const endTime = parseInt(end);
    if (isNaN(startTime) || isNaN(endTime) || startTime >= endTime) return false;
  }

  return true;
}

export function useCalendarEvents() {
  const { nostr } = useNostr();
  const { user } = useCurrentUser();
  const { privateEvents } = usePrivateCalendarEvents();
  const [publicEvents, setPublicEvents] = useState<NostrEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Stream public calendar events in real-time
  useEffect(() => {
    if (!user?.pubkey || !nostr) {
      setPublicEvents([]);
      return;
    }


    let isMounted = true;
    const controller = new AbortController();

    const startStreaming = async () => {
      try {
        setIsLoading(true);
        setPublicEvents([]);

        const eventIds = new Set<string>();

        // Create multiple subscriptions for different event types
        const filters = [
          // Events authored by the user
          {
            kinds: [31922, 31923, 31924, 31925, 31926, 31927],
            authors: [user.pubkey],
            limit: 100 // Reduced for faster initial load
          },
          // Events where the user is a participant  
          {
            kinds: [31922, 31923, 31924, 31925, 31926, 31927],
            "#p": [user.pubkey],
            limit: 100 // Reduced for faster initial load
          }
        ];


  
        // Process multiple subscriptions concurrently
        const streamPromises = filters.map(async (filter, _index) => {
          try {
              
            const subscription = nostr.req([filter], { signal: controller.signal });
            let eventCount = 0;
            
            // ✅ CORRECT: Handle relay messages properly  
            for await (const msg of subscription) {
              if (!isMounted) {
                break;
              }
              
              // Handle different message types
              if (msg[0] === 'EVENT') {
                const event = msg[2]; // ✅ Extract actual event from msg[2]
                eventCount++;
                
                
                // Skip duplicates and validate
                if (eventIds.has(event.id)) {
                  continue;
                }
                
                if (!validateCalendarEvent(event)) {
                  continue;
                }
                
                eventIds.add(event.id);
                
                // Add event immediately for real-time streaming
                setPublicEvents(prev => {
                  const updated = [...prev, event];
                  return updated.sort((a, b) => b.created_at - a.created_at);
                });
                
                // Mark as no longer loading after first event
                if (eventCount === 1) {
                  setIsLoading(false);
                }
                
              } else if (msg[0] === 'EOSE') {
                if (isMounted) {
                  setIsLoading(false); // Always clear loading on EOSE, even if no events
                }
              } else if (msg[0] === 'CLOSED') {
                break;
              }
            }
            
          } catch (error) {
            if (!controller.signal.aborted) {
              console.error('Calendar events stream error:', error);
            }
          }
        });

        // Don't wait for streams to complete - they should run indefinitely!
          
        // Set a shorter timeout to clear loading state if no events arrive
        setTimeout(() => {
          if (isMounted) {
            setIsLoading(false);
          }
        }, 2000); // 2 second timeout for faster perceived load
        
        // Just start all streams in parallel - they'll update state as events arrive
        streamPromises.forEach(promise => {
          promise.catch(_error => {
            if (!controller.signal.aborted) {
              // Handle error silently for now
            }
          });
        });
      } catch (error) {
        if (!controller.signal.aborted) {
          console.error('Calendar events streaming error:', error);
        }
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    startStreaming();

    // Cleanup
    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [user?.pubkey, nostr]);

  // Get RSVP referenced events (only pass public events since privateEvents are Rumor type)
  const { data: rsvpReferencedEvents, isLoading: isRSVPLoading } = useRSVPReferencedEvents(publicEvents);

  // Memoize validation results to avoid repeated filtering
  const validEvents = useMemo(() => ({
    public: publicEvents.filter(validateCalendarEvent),
    private: privateEvents.filter(validateCalendarEvent),
    referenced: rsvpReferencedEvents || []
  }), [publicEvents, privateEvents, rsvpReferencedEvents]);

  // Memoize transformed events to avoid repeated transformations
  const transformedEvents = useMemo(() => ({
    public: validEvents.public.map(transformEventForCalendar),
    private: validEvents.private.map(event => ({
      ...transformEventForCalendar(event),
      source: 'private'
    })),
    referenced: validEvents.referenced.map(event => ({
      ...transformEventForCalendar(event),
      source: 'referenced'
    }))
  }), [validEvents]);

  // Memoize coordinate map for RSVP lookups
  const eventByCoordinate = useMemo(() => {
    const map = new Map<string, CalendarEvent>();
    
    [...transformedEvents.public, ...transformedEvents.private, ...transformedEvents.referenced].forEach(event => {
      if (event.dTag && event.pubkey) {
        const coordinate = `${event.kind}:${event.pubkey}:${event.dTag}`;
        map.set(coordinate, event);
      }
    });
    
    return map;
  }, [transformedEvents]);

  // Combine public and private events with RSVP time inheritance
  const allEvents = useMemo(() => {
    // Process RSVP events and inherit full details (only for events that need it)
    const processedEvents = [...transformedEvents.public, ...transformedEvents.private].map(event => {
      if (event.kind === 31925 && event.needsTimeFromReference && event.referenceCoordinate) {
        const referencedEvent = eventByCoordinate.get(event.referenceCoordinate);
        if (referencedEvent && referencedEvent.start) {
          return {
            ...event, // Keep all original RSVP fields
            // Import full details from referenced event
            start: referencedEvent.start,
            end: referencedEvent.end,
            timezone: referencedEvent.timezone,
            endTimezone: referencedEvent.endTimezone,
            location: referencedEvent.location,
            description: referencedEvent.description,
            summary: referencedEvent.summary,
            image: referencedEvent.image,
            geohash: referencedEvent.geohash,
            hashtags: referencedEvent.hashtags,
            references: referencedEvent.references,
            participants: referencedEvent.participants,
            // Update title to show referenced event title with RSVP status
            title: `✓ ${referencedEvent.title || 'Event'} (${event.rsvpStatus || 'pending'})`,
            // Ensure RSVP-specific fields are preserved
            kind: 31925, // Explicitly maintain as RSVP
            source: event.pubkey === user?.pubkey ? 'rsvp-own' : 'rsvp'
          };
        }
      }
      return event;
    });

    return processedEvents.sort((a, b) => b.created_at - a.created_at);
  }, [transformedEvents, eventByCoordinate, user?.pubkey]);

  return {
    data: allEvents,
    isLoading: isLoading || isRSVPLoading, // Wait for both to complete
    error: null,
    isError: false,
    isSuccess: !isLoading && !isRSVPLoading
  };
}

export function usePublicCalendarEvents() {
  const { nostr } = useNostr();

  return useQuery({
    queryKey: ['public-calendar-events'],
    queryFn: async (c) => {
      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(5000)]);
      
      const events = await nostr.query([
        {
          kinds: [31922, 31923], // Only public date and time events
          limit: 100
        }
      ], { signal });

      // Filter events through validator
      const validEvents = events.filter(validateCalendarEvent);

      // Transform events for calendar display
      return validEvents.map(transformEventForCalendar);
    },
    staleTime: 60 * 1000, // 1 minute
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}

export function usePublicCalendarEventsWithPagination() {
  const { nostr } = useNostr();
  const [allEvents, setAllEvents] = useState<CalendarEvent[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  
  // Initial load
  const { data: initialEvents, isLoading, error } = useQuery({
    queryKey: ['public-calendar-events-paginated'],
    queryFn: async (c) => {
      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(5000)]);
      
      const events = await nostr.query([
        {
          kinds: [31922, 31923], // Only public date and time events
          limit: 100
        }
      ], { signal });

      // Filter events through validator
      const validEvents = events.filter(validateCalendarEvent);
      const transformed = validEvents.map(transformEventForCalendar);
      
      // Sort by date
      const sorted = transformed.sort((a, b) => {
        const dateA = a.kind === 31922 
          ? new Date(a.start || '').getTime() 
          : (parseInt(a.start || '0') || 0) * 1000;
        const dateB = b.kind === 31922 
          ? new Date(b.start || '').getTime() 
          : (parseInt(b.start || '0') || 0) * 1000;
        return dateA - dateB;
      });
      
      setAllEvents(sorted);
      // Check if we got at least the limit from the query (before validation)
      const hasMoreEvents = events.length >= 100;
      setHasMore(hasMoreEvents);
      
      return sorted;
    },
    staleTime: 60 * 1000, // 1 minute
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
  
  const loadMore = async () => {
    if (!hasMore || isLoadingMore || allEvents.length === 0) return;
    
    setIsLoadingMore(true);
    
    try {
      // Get the oldest event timestamp for pagination
      const oldestEvent = allEvents[allEvents.length - 1];
      const untilTimestamp = oldestEvent.kind === 31922
        ? Math.floor(new Date(oldestEvent.start || '').getTime() / 1000)
        : parseInt(oldestEvent.start || '0') || 0;
      
      const signal = AbortSignal.timeout(5000);
      
      const events = await nostr.query([
        {
          kinds: [31922, 31923],
          until: untilTimestamp - 1, // Get events before the oldest one we have
          limit: 50
        }
      ], { signal });
      
      const validEvents = events.filter(validateCalendarEvent);
      const transformed = validEvents.map(transformEventForCalendar);
      
      if (transformed.length === 0) {
        setHasMore(false);
      } else {
        // Merge and deduplicate
        const existingIds = new Set(allEvents.map(e => e.id));
        const newEvents = transformed.filter(e => !existingIds.has(e.id));
        
        if (newEvents.length > 0) {
          const merged = [...allEvents, ...newEvents].sort((a, b) => {
            const dateA = a.kind === 31922 
              ? new Date(a.start || '').getTime() 
              : (parseInt(a.start || '0') || 0) * 1000;
            const dateB = b.kind === 31922 
              ? new Date(b.start || '').getTime() 
              : (parseInt(b.start || '0') || 0) * 1000;
            return dateA - dateB;
          });
          
          setAllEvents(merged);
          // Check original events length before filtering
          setHasMore(events.length >= 50);
        } else {
          setHasMore(false);
        }
      }
    } catch (err) {
      console.error('Error loading more events:', err);
      setHasMore(false);
    } finally {
      setIsLoadingMore(false);
    }
  };
  
  return {
    data: allEvents.length > 0 ? allEvents : initialEvents,
    isLoading,
    error,
    loadMore,
    hasMore,
    isLoadingMore
  };
}

export function useAvailabilityTemplate(naddr: string) {
  const { nostr } = useNostr();

  return useQuery({
    queryKey: ['availability-template', naddr],
    queryFn: async (c) => {
      if (!naddr) return null;

      // Parse naddr to get the coordinate info
      // This is a simplified version - in reality you'd use nip19.decode
      const parts = naddr.split(':');
      if (parts.length !== 3) return null;

      const [kind, pubkey, dTag] = parts;
      if (kind !== '31926') return null;

      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(5000)]);
      
      const events = await nostr.query([
        {
          kinds: [31926],
          authors: [pubkey],
          '#d': [dTag],
          limit: 1
        }
      ], { signal });

      if (events.length === 0) return null;

      const event = events[0];
      if (!validateCalendarEvent(event)) return null;

      return transformEventForCalendar(event);
    },
    enabled: !!naddr,
    staleTime: 60 * 1000, // 1 minute
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}

export function useUserCalendars() {
  const { nostr } = useNostr();
  const { user } = useCurrentUser();

  return useQuery({
    queryKey: ['user-calendars', user?.pubkey],
    queryFn: async (c) => {
      if (!user?.pubkey) return [];

      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(5000)]);
      
      const events = await nostr.query([
        {
          kinds: [31924], // Calendar collections
          authors: [user.pubkey],
          limit: 20
        }
      ], { signal });

      const validEvents = events.filter(validateCalendarEvent);

      return validEvents.map(event => {
        const dTag = event.tags.find(tag => tag[0] === 'd')?.[1];
        const title = event.tags.find(tag => tag[0] === 'title')?.[1];
        const eventReferences = event.tags
          .filter(tag => tag[0] === 'a')
          .map(tag => tag[1]);

        return {
          id: dTag || event.id,
          name: title || 'Untitled Calendar',
          color: '#4285f4', // Default color
          eventReferences,
          rawEvent: event
        };
      });
    },
    enabled: !!user?.pubkey,
    staleTime: 60 * 1000, // 1 minute
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}