import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { useNostr } from '@nostrify/react';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { NostrEvent } from '@nostrify/nostrify';

export type RSVPStatus = 'accepted' | 'declined' | 'tentative';

interface CreateRSVPOptions {
  eventId: string;
  eventCoordinate: string;
  status: RSVPStatus;
  freeText?: string;
}

export function useCreateRSVP() {
  const { nostr } = useNostr();
  const { user } = useCurrentUser();
  const signer = (user as { signer?: { signEvent: (event: unknown) => Promise<unknown> } })?.signer;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (options: CreateRSVPOptions) => {
      if (!signer) {
        throw new Error('No signer available');
      }

      const { eventId, eventCoordinate, status, freeText } = options;

      // Create RSVP event according to NIP-52
      const rsvpEvent = {
        kind: 31925,
        content: freeText || '',
        tags: [
          ['d', eventId], // Use event ID as the d tag
          ['a', eventCoordinate], // Reference the calendar event
          ['status', status],
          ['L', 'status'],
          ['l', status, 'status']
        ],
        created_at: Math.floor(Date.now() / 1000),
      };

      // Sign and publish the event
      const signedEvent = await signer.signEvent(rsvpEvent);
      await nostr.event(signedEvent as NostrEvent);

      return signedEvent;
    },
    onSuccess: () => {
      // Invalidate relevant queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
      queryClient.invalidateQueries({ queryKey: ['user-rsvps'] });
    },
  });
}

// Hook to get all user RSVPs on page load
export function useUserRSVPs() {
  const { nostr } = useNostr();
  const { user } = useCurrentUser();

  return useQuery({
    queryKey: ['user-rsvps', user?.pubkey],
    queryFn: async () => {
      if (!user?.pubkey) return {};

      // Query for all user RSVPs
      const rsvps = await nostr.query([
        {
          kinds: [31925],
          authors: [user.pubkey],
          limit: 100
        }
      ]);

      // Create a map of event ID -> RSVP status
      const rsvpMap: Record<string, RSVPStatus> = {};
      
      for (const rsvp of rsvps) {
        const eventId = rsvp.tags.find(tag => tag[0] === 'd')?.[1];
        const status = rsvp.tags.find(tag => tag[0] === 'status')?.[1] as RSVPStatus;
        
        if (eventId && status) {
          rsvpMap[eventId] = status;
        }
      }

      return rsvpMap;
    },
    enabled: !!user?.pubkey,
    staleTime: 60 * 1000, // 1 minute
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}

// Hook to get RSVP status for a specific event
export function useRSVPStatus(eventId: string) {
  const { data: userRSVPs } = useUserRSVPs();
  
  return userRSVPs?.[eventId] || null;
}