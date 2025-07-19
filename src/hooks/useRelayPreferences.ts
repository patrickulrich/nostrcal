import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNostr } from '@nostrify/react';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { 
  RelayPreference, 
  parseRelayPreferences, 
  createRelayPreferencesEvent, 
  getDefaultRelayPreferences
} from '@/utils/relay-preferences';

/**
 * Hook to manage relay preferences for private calendar events
 */
export function useRelayPreferences() {
  const { nostr } = useNostr();
  const { user } = useCurrentUser();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['relay-preferences', user?.pubkey],
    queryFn: async (c) => {
      if (!user?.pubkey) {
        // Don't return defaults when no user - wait for user login
        return { preferences: [], hasPublished: false };
      }

      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(5000)]);
      
      const events = await nostr.query([
        {
          kinds: [10050],
          authors: [user.pubkey],
          limit: 1
        }
      ], { signal });

      if (events.length === 0) {
        return { preferences: getDefaultRelayPreferences(), hasPublished: false };
      }

      try {
        const preferences = parseRelayPreferences(events[0]);
        // If user has published preferences, use them exclusively (no defaults)
        return { 
          preferences: preferences.length > 0 ? preferences : getDefaultRelayPreferences(),
          hasPublished: true
        };
      } catch (error) {
        console.warn('Failed to parse relay preferences:', error);
        return { preferences: getDefaultRelayPreferences(), hasPublished: false };
      }
    },
    enabled: !!user?.pubkey,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  const mutation = useMutation({
    mutationFn: async (preferences: RelayPreference[]) => {
      if (!user?.signer) {
        throw new Error('User not authenticated');
      }

      const unsignedEvent = createRelayPreferencesEvent(preferences);
      const signedEvent = await user.signer.signEvent({
        kind: unsignedEvent.kind!,
        created_at: unsignedEvent.created_at!,
        tags: unsignedEvent.tags!,
        content: unsignedEvent.content!
      });
      
      await nostr.event(signedEvent);
      return preferences;
    },
    onSuccess: (preferences) => {
      queryClient.setQueryData(['relay-preferences', user?.pubkey], { preferences, hasPublished: true });
    },
  });

  return {
    preferences: query.data?.preferences || getDefaultRelayPreferences(),
    hasPublishedPreferences: query.data?.hasPublished || false,
    isLoading: query.isLoading,
    error: query.error,
    updatePreferences: mutation.mutate,
    isUpdating: mutation.isPending,
    updateError: mutation.error,
  };
}