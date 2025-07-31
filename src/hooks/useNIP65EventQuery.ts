import { useQuery } from '@tanstack/react-query';
import { useNostr } from '@nostrify/react';
import { getAuthorRelayListMetadata, getWriteRelays } from '@/utils/relay-preferences';
import { useAppContext } from '@/hooks/useAppContext';
import { NostrEvent } from '@nostrify/nostrify';

/**
 * NIP-65 compliant event query hook
 * Queries author's write relays for their content, falls back to configured relays
 */
export function useNIP65EventQuery({
  queryKey,
  filters,
  enabled = true,
}: {
  queryKey: unknown[];
  filters: any[];
  enabled?: boolean;
}) {
  const { nostr } = useNostr();
  const { config } = useAppContext();

  return useQuery({
    queryKey: ['nip65', ...queryKey],
    queryFn: async (c) => {
      if (!nostr) return [];

      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(10000)]);
      const allEvents: NostrEvent[] = [];
      const queriedRelays = new Set<string>();

      // For each filter, determine optimal relays
      for (const filter of filters) {
        let relaysToQuery = config.relayUrls || [];

        // If filter has specific authors, try to use their write relays
        if (filter.authors && Array.isArray(filter.authors) && filter.authors.length > 0) {
          const authorRelays = new Set<string>();
          
          for (const author of filter.authors) {
            try {
              const authorRelayList = await getAuthorRelayListMetadata(author, nostr);
              const writeRelays = getWriteRelays(authorRelayList);
              writeRelays.forEach(relay => authorRelays.add(relay));
            } catch (error) {
              console.warn(`[NIP-65] Failed to get relays for author ${author}:`, error);
            }
          }

          if (authorRelays.size > 0) {
            // Use author's write relays + configured relays for redundancy
            relaysToQuery = [...new Set([...authorRelays, ...(config.relayUrls || [])])];
          }
        }

        // Query the determined relays
        for (const relayUrl of relaysToQuery) {
          if (queriedRelays.has(relayUrl)) continue;
          queriedRelays.add(relayUrl);

          try {
            // Create a relay-specific query
            const relayEvents = await nostr.query([filter], { 
              signal,
              relays: [relayUrl] // Query specific relay
            });
            allEvents.push(...relayEvents);
          } catch (error) {
            console.warn(`[NIP-65] Query failed for relay ${relayUrl}:`, error);
          }
        }
      }

      // Deduplicate events by id
      const uniqueEvents = new Map<string, NostrEvent>();
      for (const event of allEvents) {
        if (!uniqueEvents.has(event.id) || event.created_at > uniqueEvents.get(event.id)!.created_at) {
          uniqueEvents.set(event.id, event);
        }
      }

      const result = Array.from(uniqueEvents.values());
      return result;
    },
    enabled: enabled && !!nostr,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}