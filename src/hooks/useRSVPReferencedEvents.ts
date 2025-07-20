import { useQuery } from '@tanstack/react-query';
import { useNostr } from '@nostrify/react';
import { NostrEvent } from '@nostrify/nostrify';
import { useMemo } from 'react';

// Hook to fetch external events referenced by user's RSVPs
export function useRSVPReferencedEvents(eventsInStream: NostrEvent[]) {
  const { nostr } = useNostr();

  // Memoize RSVP processing to avoid expensive computations on every render
  const rsvpAnalysis = useMemo(() => {
    // Find all RSVP events (kind 31925) in the stream
    const rsvpEvents = eventsInStream.filter(event => event.kind === 31925);
    
    if (rsvpEvents.length === 0) {
      return { coordinates: [], missingCoordinates: [] };
    }

    // Extract coordinates from RSVP events
    const eventCoordinates = new Set<string>();
    
    rsvpEvents.forEach(rsvp => {
      const coordinate = rsvp.tags.find(tag => tag[0] === 'a')?.[1];
      if (coordinate) {
        eventCoordinates.add(coordinate);
      }
    });

    if (eventCoordinates.size === 0) {
      return { coordinates: [], missingCoordinates: [] };
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

    return { coordinates: Array.from(eventCoordinates), missingCoordinates };
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

      // Fetch missing events from relays
      let fetchedEvents: NostrEvent[] = [];
      
      try {
        const filters = rsvpAnalysis.missingCoordinates.map(coordinate => {
          const [kindStr, referencedPubkey, referencedDTag] = coordinate.split(':');
          return {
            kinds: [parseInt(kindStr)],
            authors: [referencedPubkey],
            '#d': [referencedDTag],
            limit: 1
          };
        });

        fetchedEvents = await nostr.query(filters, { signal });
      } catch (error) {
        if (!signal.aborted) {
          console.error('Error fetching RSVP referenced events:', error);
        }
        return [];
      }

      return fetchedEvents;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes - longer caching
    gcTime: 30 * 60 * 1000, // 30 minutes - longer garbage collection
    enabled: rsvpAnalysis.missingCoordinates.length > 0,
  });
}