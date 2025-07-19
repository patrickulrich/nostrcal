import { useQuery } from '@tanstack/react-query';
import { useNostr } from '@nostrify/react';
import { useUserRSVPs } from './useRSVP';
import { NostrEvent } from '@nostrify/nostrify';

interface RSVPEventDetail {
  rsvpId: string;
  eventCoordinate: string;
  status: 'accepted' | 'declined' | 'tentative';
  originalEvent?: NostrEvent;
  eventDetails?: {
    id: string;
    kind: number;
    title?: string;
    start?: string;
    end?: string;
    location?: string;
    description?: string;
    timezone?: string;
    participants?: string[];
    dTag?: string;
  };
}

// Hook to get event details for all user RSVPs with their referenced events
export function useRSVPEventDetails() {
  const { nostr } = useNostr();
  const { data: userRSVPs } = useUserRSVPs();

  return useQuery({
    queryKey: ['rsvp-event-details', userRSVPs],
    queryFn: async () => {
      if (!userRSVPs || !nostr) return [];

      try {
        // First, get all RSVP events to extract their 'a' tag coordinates
        const rsvpEvents = await nostr.query([
          {
            kinds: [31925],
            limit: 100
          }
        ]);

        const rsvpDetails: RSVPEventDetail[] = [];

        // Process each RSVP event
        for (const rsvpEvent of rsvpEvents) {
          const eventId = rsvpEvent.tags.find(tag => tag[0] === 'd')?.[1];
          const eventCoordinate = rsvpEvent.tags.find(tag => tag[0] === 'a')?.[1];
          const status = rsvpEvent.tags.find(tag => tag[0] === 'status')?.[1] as 'accepted' | 'declined' | 'tentative';

          if (!eventId || !eventCoordinate || !status) continue;

          // Check if this RSVP belongs to current user and has a status we track
          const userStatus = userRSVPs[eventId];
          if (!userStatus) continue;

          // Parse the coordinate to get kind, pubkey, and dTag
          const coordParts = eventCoordinate.split(':');
          if (coordParts.length !== 3) continue;

          const [kindStr, pubkey, dTag] = coordParts;
          const kind = parseInt(kindStr);

          // Only fetch details for calendar events (31922, 31923)
          if (![31922, 31923].includes(kind)) continue;

          try {
            // Fetch the original calendar event
            const originalEvents = await nostr.query([
              {
                kinds: [kind],
                authors: [pubkey],
                '#d': [dTag],
                limit: 1
              }
            ]);

            if (originalEvents.length > 0) {
              const originalEvent = originalEvents[0];
              
              // Extract event details
              const title = originalEvent.tags.find(tag => tag[0] === 'title')?.[1];
              const start = originalEvent.tags.find(tag => tag[0] === 'start')?.[1];
              const end = originalEvent.tags.find(tag => tag[0] === 'end')?.[1];
              const location = originalEvent.tags.find(tag => tag[0] === 'location')?.[1];
              const timezone = originalEvent.tags.find(tag => tag[0] === 'start_tzid')?.[1] || 
                              originalEvent.tags.find(tag => tag[0] === 'timezone')?.[1];
              const participants = originalEvent.tags
                .filter(tag => tag[0] === 'p')
                .map(tag => tag[1]);

              rsvpDetails.push({
                rsvpId: eventId,
                eventCoordinate,
                status: userStatus,
                originalEvent,
                eventDetails: {
                  id: originalEvent.id,
                  kind: originalEvent.kind,
                  title,
                  start,
                  end,
                  location,
                  description: originalEvent.content,
                  timezone,
                  participants,
                  dTag
                }
              });
            }
          } catch (error) {
            console.warn(`Failed to fetch event details for coordinate ${eventCoordinate}:`, error);
          }
        }

        return rsvpDetails;
      } catch (error) {
        console.error('Failed to fetch RSVP event details:', error);
        return [];
      }
    },
    enabled: !!userRSVPs && !!nostr,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}

// Hook to get accepted RSVP events formatted as calendar events
export function useAcceptedRSVPEvents() {
  const { data: rsvpDetails } = useRSVPEventDetails();

  return {
    data: rsvpDetails?.filter(rsvp => rsvp.status === 'accepted') || [],
    isLoading: false, // Derived from rsvpDetails query
    error: null
  };
}