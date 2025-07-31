import { useQuery } from '@tanstack/react-query';
import { useNostr } from '@nostrify/react';
import { NostrEvent } from '@nostrify/nostrify';
import { useMemo } from 'react';
import { extractRelayHintsFromEvent } from '@/utils/relay-hints';
import { CalendarEvent } from '@/contexts/EventsContextTypes';

// Simple transformation for caching purposes
function transformEventForCache(event: NostrEvent): CalendarEvent {
  const dTag = event.tags.find(tag => tag[0] === 'd')?.[1];
  const title = event.tags.find(tag => tag[0] === 'title' || tag[0] === 'name')?.[1];
  const summary = event.tags.find(tag => tag[0] === 'summary')?.[1];
  const start = event.tags.find(tag => tag[0] === 'start')?.[1];
  const end = event.tags.find(tag => tag[0] === 'end')?.[1];
  const location = event.tags.find(tag => tag[0] === 'location')?.[1];

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
    summary,
    start,
    end,
    location,
    rawEvent: event,
  };
}

// Hook to fetch external events referenced by user's RSVPs
export function useRSVPReferencedEvents(eventsInStream: NostrEvent[]) {
  const { nostr } = useNostr();

  // Memoize RSVP processing to avoid expensive computations on every render
  const rsvpAnalysis = useMemo(() => {
    // Find all RSVP events (kind 31925) in the stream
    const rsvpEvents = eventsInStream.filter(event => event.kind === 31925);
    
    if (rsvpEvents.length === 0) {
      return { coordinates: [], missingCoordinates: [], relayHints: new Set<string>() };
    }

    // Extract coordinates and relay hints from RSVP events
    const eventCoordinates = new Set<string>();
    const relayHints = new Set<string>();
    
    rsvpEvents.forEach(rsvp => {
      const coordinate = rsvp.tags.find(tag => tag[0] === 'a')?.[1];
      if (coordinate) {
        eventCoordinates.add(coordinate);
      }
      
      // Extract relay hints from the RSVP event
      const hints = extractRelayHintsFromEvent(rsvp);
      for (const hintList of hints.values()) {
        hintList.forEach(hint => relayHints.add(hint));
      }
    });

    if (eventCoordinates.size === 0) {
      return { coordinates: [], missingCoordinates: [], relayHints };
    }

    // Find which coordinates are missing from the stream
    const missingCoordinates = Array.from(eventCoordinates).filter(coordinate => {
      const [kindStr, referencedPubkey, referencedDTag] = coordinate.split(':');
      const referencedKind = parseInt(kindStr);

      return !eventsInStream.find(event =>
        event.kind === referencedKind &&
        event.pubkey === referencedPubkey &&
        event.tags.find(tag => tag[0] === 'd')?.[1] === referencedDTag
      );
    });

    return { coordinates: Array.from(eventCoordinates), missingCoordinates, relayHints };
  }, [eventsInStream]);

  // Create a stable query key based on missing coordinates
  const queryKey = useMemo(() => 
    ['rsvp-referenced-events', rsvpAnalysis.missingCoordinates.sort().join(',')],
    [rsvpAnalysis.missingCoordinates]
  );

  return useQuery({
    queryKey,
    queryFn: async (c) => {
      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(3000)]); // Reduced timeout
      
      if (rsvpAnalysis.missingCoordinates.length === 0) {
        return [];
      }

      // First, check cache for missing coordinates
      const cachedEvents: NostrEvent[] = [];
      let stillMissingCoordinates = [...rsvpAnalysis.missingCoordinates];
      
      try {
        const { getCachedRSVPReferencedEventsByCoordinates } = await import('@/lib/indexeddb');
        const cached = await getCachedRSVPReferencedEventsByCoordinates(rsvpAnalysis.missingCoordinates);
        
        // Extract cached events and remove their coordinates from missing list
        cached.forEach(cachedEvent => {
          cachedEvents.push(cachedEvent.raw_event);
          stillMissingCoordinates = stillMissingCoordinates.filter(coord => coord !== cachedEvent.coordinate);
        });
      } catch (error) {
        console.warn('[RSVPReferencedEvents] Failed to load cached events:', error);
      }

      // Fetch remaining missing events from relays
      let fetchedEvents: NostrEvent[] = [];
      
      if (stillMissingCoordinates.length > 0) {
        try {
          const filters = stillMissingCoordinates.map(coordinate => {
            const [kindStr, referencedPubkey, referencedDTag] = coordinate.split(':');
            return {
              kinds: [parseInt(kindStr)],
              authors: [referencedPubkey],
              '#d': [referencedDTag],
              limit: 1
            };
          });

          // First try with relay hints if available
          const relayHintArray = Array.from(rsvpAnalysis.relayHints);
          if (relayHintArray.length > 0) {
            try {
              fetchedEvents = await nostr.query(filters, { 
                signal, 
                relays: relayHintArray 
              });
            } catch (hintError) {
              console.warn('Failed to fetch from relay hints, trying default relays:', hintError);
            }
          }

          // If we didn't get all events from hints, try default relays
          if (fetchedEvents.length < stillMissingCoordinates.length) {
            const additionalEvents = await nostr.query(filters, { signal });
            // Merge events, avoiding duplicates
            const eventIds = new Set(fetchedEvents.map(e => e.id));
            additionalEvents.forEach(event => {
              if (!eventIds.has(event.id)) {
                fetchedEvents.push(event);
              }
            });
          }

          // Cache newly fetched events
          if (fetchedEvents.length > 0) {
            
            try {
              const { cacheRSVPReferencedEvent } = await import('@/lib/indexeddb');
              
              for (const event of fetchedEvents) {
                // Find which coordinate this event satisfies
                const coordinate = stillMissingCoordinates.find(coord => {
                  const [kindStr, referencedPubkey, referencedDTag] = coord.split(':');
                  return event.kind === parseInt(kindStr) && 
                         event.pubkey === referencedPubkey && 
                         event.tags.find(tag => tag[0] === 'd')?.[1] === referencedDTag;
                });
                
                if (coordinate) {
                  const transformedData = transformEventForCache(event);
                  await cacheRSVPReferencedEvent(event, transformedData, coordinate).catch(error => {
                    console.warn('[RSVPReferencedEvents] Failed to cache event:', error);
                  });
                }
              }
            } catch (error) {
              console.warn('[RSVPReferencedEvents] Failed to cache events:', error);
            }
          }
        } catch (error) {
          if (!signal.aborted) {
            console.error('Error fetching RSVP referenced events:', error);
          }
        }
      }

      // Combine cached and fetched events
      const allEvents = [...cachedEvents, ...fetchedEvents];
      return allEvents;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes - longer caching
    gcTime: 30 * 60 * 1000, // 30 minutes - longer garbage collection
    enabled: rsvpAnalysis.missingCoordinates.length > 0,
  });
}