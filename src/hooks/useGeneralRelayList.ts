import { useQuery } from '@tanstack/react-query';
import { useNostr } from '@nostrify/react';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { NostrEvent } from '@nostrify/nostrify';

/**
 * Hook to manage general relay list (kind 10002) - NIP-65
 */

export interface GeneralRelay {
  url: string;
  read?: boolean;
  write?: boolean;
}

/**
 * Parse kind 10002 relay list metadata
 */
export function parseGeneralRelayList(event: NostrEvent): GeneralRelay[] {
  if (event.kind !== 10002) {
    throw new Error('Event is not a general relay list (kind 10002)');
  }
  
  return event.tags
    .filter(tag => tag[0] === 'r' && tag[1])
    .map(tag => ({
      url: tag[1],
      read: tag[2] !== 'write',  // read if not explicitly 'write'
      write: tag[2] !== 'read'   // write if not explicitly 'read'
    }));
}

export function useGeneralRelayList() {
  const { nostr } = useNostr();
  const { user } = useCurrentUser();

  const query = useQuery({
    queryKey: ['general-relay-list', user?.pubkey],
    queryFn: async (c) => {
      if (!user?.pubkey) {
        return null;
      }

      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(5000)]);
      
      const events = await nostr.query([
        {
          kinds: [10002],
          authors: [user.pubkey],
          limit: 1
        }
      ], { signal });

      if (events.length === 0) {
        return null;
      }

      try {
        const relays = parseGeneralRelayList(events[0]);
        return relays;
      } catch (error) {
        console.warn('Failed to parse general relay list:', error);
        return null;
      }
    },
    enabled: !!user?.pubkey,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  return {
    generalRelays: query.data,
    isLoading: query.isLoading,
    error: query.error,
    hasGeneralRelays: query.data !== null && Array.isArray(query.data) && query.data.length > 0
  };
}