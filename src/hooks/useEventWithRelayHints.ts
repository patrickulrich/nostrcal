import { useState, useEffect } from 'react';
import { useNostr } from '@nostrify/react';
import { NostrEvent } from '@nostrify/nostrify';
import { extractRelayHintsFromEvent } from '@/utils/relay-hints';

/**
 * Hook to fetch events using relay hints from participant tags
 * This ensures events can be discovered even if they're not in the user's default relay set
 */
export function useEventWithRelayHints(eventId: string | undefined, referenceEvent?: NostrEvent) {
  const { nostr } = useNostr();
  const [event, setEvent] = useState<NostrEvent | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!eventId || !nostr) {
      setEvent(null);
      return;
    }

    let isMounted = true;
    const controller = new AbortController();

    const fetchEvent = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Extract relay hints from the reference event if provided
        let relayHints: string[] = [];
        if (referenceEvent) {
          const hints = extractRelayHintsFromEvent(referenceEvent);
          // Collect all unique relay hints
          const uniqueHints = new Set<string>();
          for (const hintList of hints.values()) {
            hintList.forEach(hint => uniqueHints.add(hint));
          }
          relayHints = Array.from(uniqueHints);
        }

        // Query with relay hints if available
        const filter = {
          ids: [eventId],
          limit: 1
        };

        const subscription = nostr.req([filter], { 
          signal: controller.signal,
          relays: relayHints.length > 0 ? relayHints : undefined
        });

        for await (const msg of subscription) {
          if (!isMounted) break;
          
          if (msg[0] === 'EVENT') {
            const fetchedEvent = msg[2];
            if (fetchedEvent.id === eventId) {
              setEvent(fetchedEvent);
              setIsLoading(false);
              break;
            }
          } else if (msg[0] === 'EOSE') {
            // If we didn't find the event with relay hints, try default relays
            if (!event && relayHints.length > 0) {
              const defaultSubscription = nostr.req([filter], { 
                signal: controller.signal
              });
              
              for await (const msg of defaultSubscription) {
                if (!isMounted) break;
                
                if (msg[0] === 'EVENT') {
                  const fetchedEvent = msg[2];
                  if (fetchedEvent.id === eventId) {
                    setEvent(fetchedEvent);
                    break;
                  }
                } else if (msg[0] === 'EOSE') {
                  break;
                }
              }
            }
            setIsLoading(false);
          }
        }
      } catch (err) {
        if (!controller.signal.aborted && isMounted) {
          setError(err instanceof Error ? err : new Error('Failed to fetch event'));
          setIsLoading(false);
        }
      }
    };

    fetchEvent();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [eventId, nostr, referenceEvent, event]);

  return { event, isLoading, error };
}

/**
 * Hook to fetch multiple events using relay hints
 */
export function useEventsWithRelayHints(
  eventIds: string[],
  referenceEvents?: NostrEvent[]
) {
  const { nostr } = useNostr();
  const [events, setEvents] = useState<Map<string, NostrEvent>>(new Map());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Memoize eventIds to avoid unnecessary re-renders
  const eventIdsStr = eventIds.join(',');

  useEffect(() => {
    if (eventIds.length === 0 || !nostr) {
      setEvents(new Map());
      return;
    }

    let isMounted = true;
    const controller = new AbortController();

    const fetchEvents = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Extract all relay hints from reference events
        const allRelayHints = new Set<string>();
        if (referenceEvents) {
          for (const refEvent of referenceEvents) {
            const hints = extractRelayHintsFromEvent(refEvent);
            for (const hintList of hints.values()) {
              hintList.forEach(hint => allRelayHints.add(hint));
            }
          }
        }
        const relayHints = Array.from(allRelayHints);

        // Query with relay hints if available
        const filter = {
          ids: eventIds,
          limit: eventIds.length
        };

        const fetchedEvents = new Map<string, NostrEvent>();

        // First try with relay hints
        if (relayHints.length > 0) {
          const subscription = nostr.req([filter], { 
            signal: controller.signal,
            relays: relayHints
          });

          for await (const msg of subscription) {
            if (!isMounted) break;
            
            if (msg[0] === 'EVENT') {
              const event = msg[2];
              if (eventIds.includes(event.id)) {
                fetchedEvents.set(event.id, event);
              }
            } else if (msg[0] === 'EOSE') {
              break;
            }
          }
        }

        // Then try default relays for any missing events
        const missingIds = eventIds.filter(id => !fetchedEvents.has(id));
        if (missingIds.length > 0) {
          const subscription = nostr.req([{
            ids: missingIds,
            limit: missingIds.length
          }], { 
            signal: controller.signal
          });

          for await (const msg of subscription) {
            if (!isMounted) break;
            
            if (msg[0] === 'EVENT') {
              const event = msg[2];
              if (missingIds.includes(event.id)) {
                fetchedEvents.set(event.id, event);
              }
            } else if (msg[0] === 'EOSE') {
              break;
            }
          }
        }

        if (isMounted) {
          setEvents(fetchedEvents);
          setIsLoading(false);
        }
      } catch (err) {
        if (!controller.signal.aborted && isMounted) {
          setError(err instanceof Error ? err : new Error('Failed to fetch events'));
          setIsLoading(false);
        }
      }
    };

    fetchEvents();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [eventIdsStr, eventIds, nostr, referenceEvents]);

  return { events, isLoading, error };
}