import { useQuery } from '@tanstack/react-query';
import { useNostr } from '@nostrify/react';
import { getAuthorRelayListMetadata, getWriteRelays, getReadRelays } from '@/utils/relay-preferences';
import { useAppContext } from '@/hooks/useAppContext';

/**
 * Hook for NIP-65 compliant relay routing
 * Provides intelligent relay selection for queries and publishing
 */
export function useNIP65RelayRouting() {
  const { nostr } = useNostr();
  const { config } = useAppContext();

  /**
   * Get optimal relays for fetching content FROM specific authors
   * Uses author's write relays per NIP-65
   */
  const _getAuthorContentRelays = useQuery({
    queryKey: ['nip65-author-relays'],
    queryFn: async () => {
      // This will be populated by individual author relay queries
      return new Map<string, string[]>();
    },
    enabled: false, // Only enable when needed
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  /**
   * Get relays for fetching content FROM a specific author
   */
  const getRelaysForAuthor = async (pubkey: string): Promise<string[]> => {
    if (!nostr) {
      return config.relayUrls || [];
    }

    try {
      const authorRelays = await getAuthorRelayListMetadata(pubkey, nostr);
      const writeRelays = getWriteRelays(authorRelays);
      
      if (writeRelays.length > 0) {
        // Combine author's write relays with configured relays for redundancy
        const combinedRelays = new Set([...writeRelays, ...(config.relayUrls || [])]);
        return Array.from(combinedRelays);
      }
    } catch (error) {
      console.warn(`Failed to get relay list for author ${pubkey}:`, error);
    }

    // Fallback to configured relays
    return config.relayUrls || [];
  };

  /**
   * Get relays for delivering mentions TO specific users
   * Uses user's read relays per NIP-65
   */
  const getRelaysForMentions = async (pubkeys: string[]): Promise<string[]> => {
    if (!nostr) {
      return config.relayUrls || [];
    }

    const mentionRelays = new Set<string>();

    for (const pubkey of pubkeys) {
      try {
        const authorRelays = await getAuthorRelayListMetadata(pubkey, nostr);
        const readRelays = getReadRelays(authorRelays);
        
        readRelays.forEach(relay => mentionRelays.add(relay));
      } catch (error) {
        console.warn(`Failed to get relay list for mentioned user ${pubkey}:`, error);
      }
    }

    // Combine with configured relays
    const combinedRelays = new Set([...mentionRelays, ...(config.relayUrls || [])]);
    return Array.from(combinedRelays);
  };

  /**
   * Get optimal relays for a specific query filter
   * Implements NIP-65 routing logic
   */
  const getRelaysForFilter = async (filter: any): Promise<string[]> => {
    // If filter has specific authors, use their write relays
    if (filter.authors && Array.isArray(filter.authors) && filter.authors.length > 0) {
      const allRelays = new Set<string>();
      
      for (const author of filter.authors) {
        const authorRelays = await getRelaysForAuthor(author);
        authorRelays.forEach(relay => allRelays.add(relay));
      }
      
      return Array.from(allRelays);
    }

    // For general queries, use configured relays
    return config.relayUrls || [];
  };

  /**
   * Get relays for publishing an event
   * Includes author's write relays + mentioned users' read relays
   */
  const getRelaysForPublishing = async (event: any): Promise<string[]> => {
    const publishRelays = new Set<string>();
    
    // Add configured relays (author's preference)
    (config.relayUrls || []).forEach(relay => publishRelays.add(relay));

    // Add mentioned users' read relays
    const mentionedUsers = event.tags
      ?.filter((tag: string[]) => tag[0] === 'p' && tag[1])
      ?.map((tag: string[]) => tag[1]) || [];

    if (mentionedUsers.length > 0) {
      const mentionRelays = await getRelaysForMentions(mentionedUsers);
      mentionRelays.forEach(relay => publishRelays.add(relay));
    }

    return Array.from(publishRelays);
  };

  return {
    getRelaysForAuthor,
    getRelaysForMentions,
    getRelaysForFilter,
    getRelaysForPublishing,
  };
}