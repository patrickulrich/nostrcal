import { useState, useEffect, useMemo, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNostr } from '@nostrify/react';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { usePrivateCalendarEvents } from '@/hooks/usePrivateCalendarEvents';
// NIP-65: All hooks in this file now benefit from intelligent relay routing
// via the enhanced reqRouter in NostrProvider
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
  let start = event.tags.find(tag => tag[0] === 'start')?.[1];
  let end = event.tags.find(tag => tag[0] === 'end')?.[1];
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

  // Special handling for NIP-53 Room Meeting events (kind 30313)
  let nip53Data: {
    status?: string;
    currentParticipants?: string;
    totalParticipants?: string;
    roomReference?: string;
  } = {};

  if (event.kind === 30313) {
    // For room meetings, use 'starts' and 'ends' tags instead of 'start' and 'end'
    const starts = event.tags.find(tag => tag[0] === 'starts')?.[1];
    const ends = event.tags.find(tag => tag[0] === 'ends')?.[1];
    
    // Override the start/end with NIP-53 specific tags
    if (starts) {
      // Convert from unix timestamp to the format expected by our components
      const startTime = parseInt(starts);
      if (!isNaN(startTime)) {
        start = startTime.toString(); // Store as string to match NIP-52 format
      }
    }
    
    if (ends) {
      const endTime = parseInt(ends);
      if (!isNaN(endTime)) {
        end = endTime.toString();
      }
    }

    // Extract NIP-53 specific fields
    nip53Data = {
      status: event.tags.find(tag => tag[0] === 'status')?.[1],
      currentParticipants: event.tags.find(tag => tag[0] === 'current_participants')?.[1],
      totalParticipants: event.tags.find(tag => tag[0] === 'total_participants')?.[1],
      roomReference: event.tags.find(tag => tag[0] === 'a')?.[1]
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
    ...nip53Data,
    rawEvent: 'sig' in event ? event : undefined
  };
}

// Validate calendar event according to NIP-52 and NIP-53
function validateCalendarEvent(event: NostrEvent | Rumor): boolean {
  // Check if it's a calendar event kind (NIP-52) or room meeting kind (NIP-53)
  if (![31922, 31923, 31924, 31925, 31926, 31927, 30313].includes(event.kind)) return false;

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

  // Room meetings (30313) require title, starts, and status per NIP-53
  if (event.kind === 30313) {
    const title = event.tags.find(([name]) => name === 'title')?.[1];
    const starts = event.tags.find(([name]) => name === 'starts')?.[1];
    const status = event.tags.find(([name]) => name === 'status')?.[1];
    
    if (!title || !starts || !status) return false;
    
    // Validate status is one of the allowed values
    if (!['planned', 'live', 'ended'].includes(status)) return false;
    
    // Validate starts is a valid unix timestamp
    const startTime = parseInt(starts);
    if (isNaN(startTime) || startTime <= 0) return false;
  }

  return true;
}

export function useCalendarEvents() {
  const { nostr } = useNostr();
  const { user, isLoading: isUserLoading } = useCurrentUser();
  const { privateEvents } = usePrivateCalendarEvents();
  const [publicEvents, setPublicEvents] = useState<NostrEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [cacheError, setCacheError] = useState<string | null>(null);
  const [usingCache, setUsingCache] = useState(false);
  const isLoadingInProgressRef = useRef(false);
  const publicEventsRef = useRef<NostrEvent[]>([]);
  const cacheErrorRef = useRef<string | null>(null);

  // Keep refs in sync with state
  publicEventsRef.current = publicEvents;
  cacheErrorRef.current = cacheError;

  // Load cached events first, then stream from relays
  useEffect(() => {
    // Wait for authentication to complete before deciding what to do
    if (isUserLoading) {
      return;
    }
    
    // Prevent multiple simultaneous loading operations
    if (isLoadingInProgressRef.current) {
      return;
    }
    
    // If no user is logged in after auth completes, show empty calendar
    if (!user?.pubkey || !nostr) {
      setPublicEvents([]);
      setIsLoading(false);
      setUsingCache(false);
      setCacheError(null);
      isLoadingInProgressRef.current = false;
      return;
    };

    let isMounted = true;
    const controller = new AbortController();

    const loadCachedEvents = async () => {
      try {
        // Load cached public events immediately - get all cached events for any kind we support
        // We can't easily filter by "user participation" in IndexedDB, so we load all and filter in memory
        const cached = await import('@/lib/indexeddb').then(({ getCachedPublicEvents }) => 
          getCachedPublicEvents({
            kinds: [31922, 31923, 31924, 31925, 31926, 31927, 30313],
            // Don't filter by pubkeys here - we need all events to check participation
          })
        );

        if (cached.length > 0 && isMounted) {
          // Filter cached events to match original logic: events by user OR events where user is participant
          const relevantCachedEvents = cached.filter(cachedEvent => {
            const event = cachedEvent.raw_event;
            // Events authored by user
            if (event.pubkey === user.pubkey) return true;
            // Events where user is participant (has 'p' tag with user's pubkey)
            const participantTags = event.tags.filter(tag => tag[0] === 'p');
            return participantTags.some(tag => tag[1] === user.pubkey);
          });

          if (relevantCachedEvents.length > 0) {
            const cachedRawEvents = relevantCachedEvents.map(c => c.raw_event);
            setPublicEvents(cachedRawEvents);
            setUsingCache(true);
            setIsLoading(false);
            
            return cachedRawEvents; // Return cached events directly
          } else {
            // No relevant cached events, proceed with normal loading
            setUsingCache(false);
            setIsLoading(true);
            return null;
          }
        } else if (isMounted) {
          // No cached events found, proceed with normal loading
          setUsingCache(false);
          setIsLoading(true);
          return null;
        }
        return null;
      } catch (error) {
        console.warn('Failed to load cached events, falling back to relay-only:', error);
        
        // Check if it's a quota/storage issue
        if (error instanceof Error && (
          error.name === 'QuotaExceededError' || 
          error.message.includes('quota') ||
          error.message.includes('storage')
        )) {
          setCacheError('Storage quota exceeded. Consider clearing browser data or freeing up space.');
        } else {
          setCacheError('Cache unavailable. Using relay-only mode.');
        }
        
        setUsingCache(false);
        if (isMounted) {
          setIsLoading(true); // Continue with normal relay loading
        }
        return null;
      }
    };

    const startStreaming = async (cachedEvents: NostrEvent[] | null = null) => {
      const hasCachedEvents = cachedEvents && cachedEvents.length > 0;
      
      try {
        // Don't clear events if we have cached ones
        if (!hasCachedEvents) {
          setIsLoading(true);
          setPublicEvents([]);
        }

        const eventIds = new Set<string>();

        // Track cached event IDs to avoid duplicates
        const eventsToTrack = cachedEvents || [];
        eventsToTrack.forEach(event => eventIds.add(event.id));

        // Two separate filters for OR logic: events by user OR events where user is participant
        const filters = [
          {
            kinds: [31922, 31923, 31924, 31925, 31926, 31927, 30313],
            authors: [user.pubkey],
            limit: 25, // Split limit between both filters
            since: Math.floor(Date.now() / 1000) - (90 * 24 * 60 * 60) // Only last 90 days for faster loading
          },
          {
            kinds: [31922, 31923, 31924, 31925, 31926, 31927, 30313],
            "#p": [user.pubkey], 
            limit: 25, // Split limit between both filters
            since: Math.floor(Date.now() / 1000) - (90 * 24 * 60 * 60) // Only last 90 days for faster loading
          }
        ];

        // Single subscription with multiple filters for better performance
        try {
          const subscription = nostr.req(filters, { signal: controller.signal });
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
              
              // Handle duplicates - update last_seen for cached events
              if (eventIds.has(event.id)) {
                // Update last_seen timestamp AND re-cache the event with latest data
                try {
                  const transformedEvent = transformEventForCalendar(event);
                  import('@/lib/indexeddb').then(({ cachePublicEvent }) => {
                    cachePublicEvent(event, transformedEvent).catch(() => {});
                  });
                } catch {
                  // Silently fail - this is just optimization
                }
                continue;
              }
              
              // Lazy validation - only validate if event is likely to be displayed
              if (!validateCalendarEvent(event)) {
                continue;
              }
              
              eventIds.add(event.id);
              
              // Background relay metadata caching (non-blocking)
              if (event.pubkey) {
                import('@/utils/relay-preferences').then(({ getAuthorRelayListMetadata }) => {
                  getAuthorRelayListMetadata(event.pubkey, nostr).catch(() => {});
                });
              }

              // Cache new event in background (non-blocking)
              if (!cacheErrorRef.current) { // Only try caching if cache is working
                try {
                  const transformedEvent = transformEventForCalendar(event);
                  import('@/lib/indexeddb').then(({ cachePublicEvent }) => {
                    cachePublicEvent(event, transformedEvent).catch(error => {
                      console.warn('Failed to cache event:', error);
                      
                      // Set appropriate error message based on error type
                      if (error instanceof Error && (
                        error.name === 'QuotaExceededError' || 
                        error.message.includes('quota') ||
                        error.message.includes('storage')
                      )) {
                        setCacheError('Storage quota exceeded. Consider clearing browser data.');
                      } else {
                        setCacheError('Cache storage issue detected.');
                      }
                    });
                  });
                } catch (error) {
                  // Don't block if caching fails
                  console.warn('Failed to transform/cache event:', error);
                }
              }
              
              // Batch state updates for better performance
              setPublicEvents(prev => {
                const updated = [...prev, event];
                return updated.sort((a, b) => b.created_at - a.created_at);
              });
              
              // Clear loading after first event for immediate feedback (unless using cache)
              if (eventCount === 1 && !hasCachedEvents) {
                setIsLoading(false);
              }
              
            } else if (msg[0] === 'EOSE') {
              if (isMounted) {
                setIsLoading(false);
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

        // Set aggressive timeout for better UX - show empty calendar quickly if no events
        setTimeout(() => {
          if (isMounted) {
            setIsLoading(false);
          }
        }, 1000); // Reduced to 1 second for faster perceived load
      } catch (error) {
        if (!controller.signal.aborted) {
          console.error('Calendar events streaming error:', error);
        }
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    // Set loading flag to prevent multiple simultaneous operations
    isLoadingInProgressRef.current = true;
    
    // Load cached events first, then start streaming
    loadCachedEvents().then((cachedEvents) => {
      if (isMounted) {
        return startStreaming(cachedEvents);
      }
    }).catch(error => {
      console.error('Error in loadCachedEvents:', error);
      // Fallback to streaming without cache
      if (isMounted) {
        return startStreaming(null);
      }
    }).finally(() => {
      // Clear loading flag when everything is complete
      if (isMounted) {
        isLoadingInProgressRef.current = false;
      }
    });

    // Cleanup
    return () => {
      isMounted = false;
      controller.abort();
      isLoadingInProgressRef.current = false;
    };
  }, [user?.pubkey, nostr, isUserLoading]); // Include isUserLoading to wait for auth completion

  // Background cache cleanup - run once on mount
  useEffect(() => {
    const cleanupCache = async () => {
      try {
        const { cleanupExpiredEvents } = await import('@/lib/indexeddb');
        const result = await cleanupExpiredEvents();
        if (result.deletedPublic > 0 || result.deletedPrivate > 0 || result.deletedRSVP > 0) {
          // Cache cleanup completed silently
        }
      } catch (error) {
        console.warn('Failed to cleanup expired cached events:', error);
      }
    };

    // Run cleanup on mount (with delay to not block initial render)
    setTimeout(cleanupCache, 5000);
  }, []);

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
    error: cacheError,
    isError: !!cacheError,
    isSuccess: !isLoading && !isRSVPLoading,
    usingCache,
    cacheError
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
          kinds: [31922, 31923, 30313], // Public date, time events, and NIP-53 room meetings
          limit: 100
        }
      ], { signal });

      // Filter events through validator
      const validEvents = events.filter(validateCalendarEvent);

      // NIP-65: Proactively cache author relay preferences for better profile discovery
      validEvents.forEach(event => {
        if (event.pubkey) {
          // Don't await - run in background to avoid blocking
          import('@/utils/relay-preferences').then(({ getAuthorRelayListMetadata }) => {
            getAuthorRelayListMetadata(event.pubkey, nostr).catch(() => {
              // Silently fail - this is just optimization
            });
          });
        }
      });

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
          kinds: [31922, 31923, 30313], // Public date, time events, and NIP-53 room meetings
          limit: 100
        }
      ], { signal });

      // Filter events through validator
      const validEvents = events.filter(validateCalendarEvent);
      
      // NIP-65: Proactively cache author relay preferences for better profile discovery
      validEvents.forEach(event => {
        if (event.pubkey) {
          // Don't await - run in background to avoid blocking
          import('@/utils/relay-preferences').then(({ getAuthorRelayListMetadata }) => {
            getAuthorRelayListMetadata(event.pubkey, nostr).catch(() => {
              // Silently fail - this is just optimization
            });
          });
        }
      });
      
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
          kinds: [31922, 31923, 30313],
          until: untilTimestamp - 1, // Get events before the oldest one we have
          limit: 50
        }
      ], { signal });
      
      const validEvents = events.filter(validateCalendarEvent);
      
      // NIP-65: Proactively cache author relay preferences for better profile discovery
      validEvents.forEach(event => {
        if (event.pubkey) {
          // Don't await - run in background to avoid blocking
          import('@/utils/relay-preferences').then(({ getAuthorRelayListMetadata }) => {
            getAuthorRelayListMetadata(event.pubkey, nostr).catch(() => {
              // Silently fail - this is just optimization
            });
          });
        }
      });
      
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