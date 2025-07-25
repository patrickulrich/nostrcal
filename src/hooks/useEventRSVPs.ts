import { useQuery } from '@tanstack/react-query';
import { useNostr } from '@nostrify/react';
import { NostrEvent } from '@nostrify/nostrify';
import { RSVPStatus } from '@/hooks/useRSVP';

export interface EventRSVP {
  id: string;
  pubkey: string;
  status: RSVPStatus;
  content: string;
  created_at: number;
  event: NostrEvent;
}

interface UseEventRSVPsOptions {
  eventId?: string;
  eventCoordinate?: string;
  enabled?: boolean;
}

export function useEventRSVPs({ eventId, eventCoordinate, enabled = true }: UseEventRSVPsOptions) {
  const { nostr } = useNostr();

  return useQuery({
    queryKey: ['event-rsvps', eventId, eventCoordinate],
    queryFn: async () => {
      if (!eventId && !eventCoordinate) {
        return [];
      }

      // Build filter for RSVPs
      const filters: any[] = [];
      
      if (eventId) {
        // Query by d tag
        filters.push({
          kinds: [31925],
          '#d': [eventId],
          limit: 100
        });
      }
      
      if (eventCoordinate) {
        // Query by a tag (event coordinate)
        filters.push({
          kinds: [31925],
          '#a': [eventCoordinate],
          limit: 100
        });
      }

      const signal = AbortSignal.timeout(10000);
      const rsvpEvents = await nostr.query(filters, { signal });

      // Process RSVPs and group by pubkey (keep latest per user)
      const rsvpMap = new Map<string, EventRSVP>();
      
      for (const event of rsvpEvents) {
        const status = event.tags.find(tag => tag[0] === 'status')?.[1] as RSVPStatus;
        const dTag = event.tags.find(tag => tag[0] === 'd')?.[1];
        const aTag = event.tags.find(tag => tag[0] === 'a')?.[1];
        
        // Validate RSVP
        if (!status || !['accepted', 'declined', 'tentative'].includes(status)) {
          continue;
        }
        
        // Match by either d tag or a tag
        const matchesEvent = (eventId && dTag === eventId) || (eventCoordinate && aTag === eventCoordinate);
        if (!matchesEvent) {
          continue;
        }

        const existingRSVP = rsvpMap.get(event.pubkey);
        
        // Keep the latest RSVP per user
        if (!existingRSVP || event.created_at > existingRSVP.created_at) {
          rsvpMap.set(event.pubkey, {
            id: event.id,
            pubkey: event.pubkey,
            status,
            content: event.content,
            created_at: event.created_at,
            event
          });
        }
      }

      return Array.from(rsvpMap.values());
    },
    enabled: enabled && (!!eventId || !!eventCoordinate),
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Helper hook to get RSVP counts
export function useEventRSVPCounts({ eventId, eventCoordinate, enabled = true }: UseEventRSVPsOptions) {
  const { data: rsvps = [], ...rest } = useEventRSVPs({ eventId, eventCoordinate, enabled });

  const counts = {
    accepted: rsvps.filter(rsvp => rsvp.status === 'accepted').length,
    declined: rsvps.filter(rsvp => rsvp.status === 'declined').length,
    tentative: rsvps.filter(rsvp => rsvp.status === 'tentative').length,
    total: rsvps.length
  };

  const attendees = {
    accepted: rsvps.filter(rsvp => rsvp.status === 'accepted'),
    declined: rsvps.filter(rsvp => rsvp.status === 'declined'),
    tentative: rsvps.filter(rsvp => rsvp.status === 'tentative')
  };

  return {
    counts,
    attendees,
    rsvps,
    ...rest
  };
}