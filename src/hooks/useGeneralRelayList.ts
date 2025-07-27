import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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

/**
 * Hook to publish general relay list (kind 10002) - NIP-65
 */
export function usePublishGeneralRelayList() {
  const { nostr } = useNostr();
  const { user } = useCurrentUser();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (relays: GeneralRelay[]) => {
      if (!user?.signer) {
        throw new Error('User not authenticated');
      }

      // Create kind 10002 event tags
      const tags = relays.map(relay => {
        const tag = ['r', relay.url];
        
        if (relay.read === false && relay.write === true) {
          tag.push('write');
        } else if (relay.read === true && relay.write === false) {
          tag.push('read');
        }
        // If both read and write are true (or undefined), no third parameter needed
        
        return tag;
      });

      const unsignedEvent = {
        kind: 10002,
        created_at: Math.floor(Date.now() / 1000),
        tags,
        content: '',
      };

      const signedEvent = await user.signer.signEvent(unsignedEvent);
      const result = await nostr.event(signedEvent);

      // Invalidate the relay list query to refetch
      queryClient.invalidateQueries({ queryKey: ['general-relay-list', user.pubkey] });

      console.log('[NIP-65] Published general relay list (kind 10002) with', relays.length, 'relays');
      return result;
    },
  });
}