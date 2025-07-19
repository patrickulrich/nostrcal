import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNostr } from '@nostrify/react';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useAppContext } from '@/hooks/useAppContext';

/**
 * Hook to manage Blossom servers according to BUD-03
 * Fetches user's kind 10063 events and provides functions to update them
 */
export function useBlossomServers() {
  const { nostr } = useNostr();
  const { user } = useCurrentUser();
  const { config, updateConfig } = useAppContext();
  const queryClient = useQueryClient();

  // Fetch user's published Blossom servers (kind 10063)
  const {
    data: publishedServers,
    isLoading: isLoadingPublished,
    error: publishedError
  } = useQuery({
    queryKey: ['blossom-servers', user?.pubkey],
    queryFn: async () => {
      if (!user?.pubkey || !nostr) return null;

      const signal = AbortSignal.timeout(10000);
      
      const events = await nostr.query([{
        kinds: [10063],
        authors: [user.pubkey],
        limit: 1
      }], { signal });

      if (events.length === 0) return null;

      // Get the most recent event
      const latestEvent = events.sort((a, b) => b.created_at - a.created_at)[0];
      
      // Extract server URLs from server tags
      const servers = latestEvent.tags
        .filter(tag => tag[0] === 'server' && tag[1])
        .map(tag => tag[1])
        .filter(url => url.startsWith('http://') || url.startsWith('https://'));

      return {
        event: latestEvent,
        servers,
        updatedAt: new Date(latestEvent.created_at * 1000)
      };
    },
    enabled: !!user?.pubkey && !!nostr,
    staleTime: 60 * 1000, // 1 minute
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  // Publish user's preferred Blossom servers
  const publishServers = useMutation({
    mutationFn: async (servers: string[]) => {
      if (!user?.signer) {
        throw new Error('User not authenticated');
      }

      if (servers.length === 0) {
        throw new Error('At least one server is required');
      }

      // Validate server URLs
      const validServers = servers.filter(url => {
        try {
          new URL(url);
          return url.startsWith('http://') || url.startsWith('https://');
        } catch {
          return false;
        }
      });

      if (validServers.length === 0) {
        throw new Error('No valid server URLs provided');
      }

      const unsignedEvent = {
        kind: 10063,
        content: '',
        tags: validServers.map(server => ['server', server]),
        created_at: Math.floor(Date.now() / 1000)
      };

      const signedEvent = await user.signer.signEvent(unsignedEvent);
      await nostr.event(signedEvent);
      
      return signedEvent;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blossom-servers', user?.pubkey] });
    },
  });

  // Import published servers into local config
  const importPublishedServers = () => {
    if (publishedServers?.servers && publishedServers.servers.length > 0) {
      updateConfig(prev => ({
        ...prev,
        blossomServers: publishedServers.servers
      }));
      return true;
    }
    return false;
  };

  // Publish current config servers to Nostr
  const publishConfigServers = () => {
    const configServers = config.blossomServers || [];
    const servers = configServers.filter(s => s && s.trim() !== '');
    if (servers.length > 0) {
      return publishServers.mutateAsync(servers);
    }
    throw new Error('No servers in config to publish');
  };

  // Get effective servers list (published servers first, then local config, then fallback)
  const getEffectiveServers = (): string[] => {
    // First priority: user's published servers (kind 10063)
    if (publishedServers?.servers && publishedServers.servers.length > 0) {
      return publishedServers.servers;
    }

    // Second priority: local config
    const configServers = config.blossomServers || [];
    if (configServers.length > 0) {
      const configured = configServers.filter(s => s && s.trim() !== '');
      if (configured.length > 0) return configured;
    }

    // Fallback: default servers (recommend Primal's)
    return [
      'https://blossom.primal.net/'
    ];
  };

  return {
    // Published servers from kind 10063
    publishedServers,
    isLoadingPublished,
    publishedError,
    
    // Local config servers
    configServers: config.blossomServers || [],
    
    // Effective servers to use
    effectiveServers: getEffectiveServers(),
    
    // Actions
    publishServers: publishServers.mutate,
    publishServersAsync: publishServers.mutateAsync,
    isPublishing: publishServers.isPending,
    publishError: publishServers.error,
    
    importPublishedServers,
    publishConfigServers,
    
    // Status
    hasPublishedServers: !!publishedServers?.servers?.length,
    hasConfigServers: !!(config.blossomServers?.length),
    serversOutOfSync: (publishedServers?.servers || []).join(',') !== (config.blossomServers || []).join(',')
  };
}