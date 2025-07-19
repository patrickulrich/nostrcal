import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNostr } from '@nostrify/react';
import { useCurrentUser } from '@/hooks/useCurrentUser';

interface CreateCalendarEventData {
  kind: 31922 | 31923 | 31924 | 31925 | 31926 | 31927;
  title: string;
  summary?: string;
  image?: string;
  start?: string;
  end?: string;
  location?: string;
  geohash?: string;
  description?: string;
  timezone?: string;
  endTimezone?: string;
  hashtags?: string[];
  references?: string[];
  participants?: string[];
  tags?: string[][];
  isPrivate?: boolean;
  dTag?: string;
}

interface CreateAvailabilityTemplateData {
  title: string;
  description?: string;
  availability: {
    [day: string]: { start: string; end: string }[];
  };
  duration: number;
  buffer: number;
  interval?: number; // Optional, defaults to duration
  timezone: string;
  calendarRef?: string;
}

interface CreateRSVPData {
  eventCoordinate: string;
  eventId: string;
  status: 'accepted' | 'declined' | 'tentative';
  note?: string;
  eventAuthorPubkey: string;
}

// Generate UUID for d tags
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export function useCalendarPublish() {
  const { nostr } = useNostr();
  const { user } = useCurrentUser();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (eventData: CreateCalendarEventData) => {
      if (!user?.pubkey) {
        throw new Error('User not authenticated');
      }

      const dTag = eventData.dTag || generateUUID();
      
      // Build base tags
      const tags: string[][] = [
        ['d', dTag],
        ['title', eventData.title],
      ];

      // Add common optional tags according to NIP-52
      if (eventData.summary) tags.push(['summary', eventData.summary]);
      if (eventData.image) tags.push(['image', eventData.image]);
      if (eventData.location) tags.push(['location', eventData.location]);
      if (eventData.geohash) tags.push(['g', eventData.geohash]);
      
      // Add hashtags
      if (eventData.hashtags) {
        eventData.hashtags.forEach(hashtag => {
          tags.push(['t', hashtag]);
        });
      }
      
      // Add references
      if (eventData.references) {
        eventData.references.forEach(reference => {
          tags.push(['r', reference]);
        });
      }

      // Add participants
      if (eventData.participants) {
        eventData.participants.forEach(pubkey => {
          tags.push(['p', pubkey, '', 'participant']);
        });
      }

      // Add kind-specific tags
      if (eventData.kind === 31922) {
        // Date-based event
        if (eventData.start) tags.push(['start', eventData.start]);
        if (eventData.end) tags.push(['end', eventData.end]);
      } else if (eventData.kind === 31923) {
        // Time-based event
        if (eventData.start) tags.push(['start', eventData.start]);
        if (eventData.end) tags.push(['end', eventData.end]);
        if (eventData.timezone) {
          tags.push(['start_tzid', eventData.timezone]);
        }
        if (eventData.endTimezone) {
          tags.push(['end_tzid', eventData.endTimezone]);
        } else if (eventData.timezone) {
          // If no end timezone specified, use start timezone
          tags.push(['end_tzid', eventData.timezone]);
        }
      }

      // Add custom tags
      if (eventData.tags) {
        tags.push(...eventData.tags);
      }

      // Create the event
      const unsignedEvent = {
        kind: eventData.kind,
        created_at: Math.floor(Date.now() / 1000),
        tags,
        content: eventData.description || '',
      };

      // Sign and publish the event
      const signedEvent = await user.signer.signEvent(unsignedEvent);
      const result = await nostr.event(signedEvent);
      
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
      queryClient.invalidateQueries({ queryKey: ['user-calendars'] });
      
      return result;
    },
  });
}

export function useCreateAvailabilityTemplate() {
  const { nostr } = useNostr();
  const { user } = useCurrentUser();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (templateData: CreateAvailabilityTemplateData) => {
      if (!user?.pubkey) {
        throw new Error('User not authenticated');
      }

      const dTag = generateUUID();
      
      const interval = templateData.interval || templateData.duration; // Default interval to duration
      
      const tags: string[][] = [
        ['d', dTag],
        ['title', templateData.title],
        ['duration', `PT${templateData.duration}M`], // ISO-8601 duration format
        ['interval', `PT${interval}M`], // Gap between slot starts
        ['buffer_before', `PT${templateData.buffer}M`], // Fixed: use buffer_before
        ['buffer_after', `PT${templateData.buffer}M`], // Add buffer_after (same value for now)
        ['tzid', templateData.timezone], // Fixed: use tzid instead of timezone
      ];

      if (templateData.description) {
        tags.push(['summary', templateData.description]);
      }

      if (templateData.calendarRef) {
        tags.push(['a', templateData.calendarRef]);
      }

      // Add schedule tags
      Object.entries(templateData.availability).forEach(([day, slots]) => {
        slots.forEach(slot => {
          tags.push(['sch', day, slot.start, slot.end]);
        });
      });

      const unsignedEvent = {
        kind: 31926,
        created_at: Math.floor(Date.now() / 1000),
        tags,
        content: templateData.description || '',
      };

      const signedEvent = await user.signer.signEvent(unsignedEvent);
      const result = await nostr.event(signedEvent);
      
      queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
      
      return result;
    },
  });
}

export function useCreateRSVP() {
  const { nostr } = useNostr();
  const { user } = useCurrentUser();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (rsvpData: CreateRSVPData) => {
      if (!user?.pubkey) {
        throw new Error('User not authenticated');
      }

      const dTag = generateUUID();
      
      const tags: string[][] = [
        ['d', dTag],
        ['a', rsvpData.eventCoordinate],
        ['e', rsvpData.eventId],
        ['status', rsvpData.status],
        ['p', rsvpData.eventAuthorPubkey],
      ];

      // Add free/busy status
      if (rsvpData.status === 'accepted') {
        tags.push(['fb', 'busy']);
      } else {
        tags.push(['fb', 'free']);
      }

      const unsignedEvent = {
        kind: 31925,
        created_at: Math.floor(Date.now() / 1000),
        tags,
        content: rsvpData.note || '',
      };

      const signedEvent = await user.signer.signEvent(unsignedEvent);
      const result = await nostr.event(signedEvent);
      
      queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
      
      return result;
    },
  });
}

export function useCreateCalendar() {
  const { nostr } = useNostr();
  const { user } = useCurrentUser();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (calendarData: { name: string; description?: string; eventReferences?: string[] }) => {
      if (!user?.pubkey) {
        throw new Error('User not authenticated');
      }

      const dTag = generateUUID();
      
      const tags: string[][] = [
        ['d', dTag],
        ['title', calendarData.name],
      ];

      // Add event references
      if (calendarData.eventReferences) {
        calendarData.eventReferences.forEach(ref => {
          tags.push(['a', ref]);
        });
      }

      const unsignedEvent = {
        kind: 31924,
        created_at: Math.floor(Date.now() / 1000),
        tags,
        content: calendarData.description || '',
      };

      const signedEvent = await user.signer.signEvent(unsignedEvent);
      const result = await nostr.event(signedEvent);
      
      queryClient.invalidateQueries({ queryKey: ['user-calendars'] });
      
      return result;
    },
  });
}

export function useDeleteCalendarEvent() {
  const { nostr } = useNostr();
  const { user } = useCurrentUser();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (eventId: string) => {
      if (!user?.pubkey) {
        throw new Error('User not authenticated');
      }

      // Create NIP-09 deletion event
      const unsignedEvent = {
        kind: 5,
        created_at: Math.floor(Date.now() / 1000),
        tags: [['e', eventId]],
        content: 'Deleted calendar event',
      };

      const signedEvent = await user.signer.signEvent(unsignedEvent);
      const result = await nostr.event(signedEvent);
      
      queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
      queryClient.invalidateQueries({ queryKey: ['user-calendars'] });
      
      return result;
    },
  });
}