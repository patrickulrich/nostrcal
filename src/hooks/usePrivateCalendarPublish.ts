import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useRelayPreferences } from '@/hooks/useRelayPreferences';
// import { usePrivateCalendarEvents } from '@/hooks/usePrivateCalendarEvents';
import { useNostr } from '@nostrify/react';
import { 
  createRumor, 
  createGiftWrapsForRecipients, 
  extractParticipants,
  publishGiftWrapsToParticipants
} from '@/utils/nip59';
import { getParticipantRelayPreferences } from '@/utils/relay-preferences';

/**
 * Hook for publishing private calendar events
 */
export function usePrivateCalendarPublish() {
  const { nostr } = useNostr();
  const { user } = useCurrentUser();
  const { preferences: _preferences } = useRelayPreferences();
  const queryClient = useQueryClient();

  const publishPrivateEvent = useMutation({
    mutationFn: async ({
      kind,
      content,
      tags,
      participants
    }: {
      kind: number;
      content: string;
      tags: string[][];
      participants: string[];
    }) => {
      if (!user?.signer) {
        throw new Error('User not authenticated');
      }

      // Add participant tags to the event
      const eventTags = [...tags];
      participants.forEach(pubkey => {
        eventTags.push(['p', pubkey, '', 'participant']);
      });


      // Create the unsigned calendar event (rumor)
      const rumor = await createRumor({
        kind,
        content,
        tags: eventTags,
        created_at: Math.floor(Date.now() / 1000)
      }, user.signer);


      // Extract all participants (including creator)
      const allParticipants = extractParticipants(rumor);

      // Create gift wraps for all participants
      const giftWraps = await createGiftWrapsForRecipients(
        rumor,
        user.signer,
        allParticipants
      );


      // Publish gift wraps to participants' relay preferences
      const publishResults = await publishGiftWrapsToParticipants(
        giftWraps,
        nostr,
        getParticipantRelayPreferences
      );
      
      
      if (publishResults.successful === 0) {
        throw new Error('Failed to publish to any participant relays');
      }

      return rumor;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['private-calendar-events', user?.pubkey] });
    },
  });

  const publishPrivateDateEvent = useMutation({
    mutationFn: async ({
      title,
      description,
      summary,
      image,
      start,
      end,
      location,
      locations,
      geohash,
      hashtags,
      references,
      participants,
      participantsWithMetadata,
      dTag
    }: {
      title: string;
      description?: string; // Make optional to handle empty content
      summary?: string;
      image?: string;
      start: string; // YYYY-MM-DD format
      end?: string;
      location?: string;
      locations?: string[];
      geohash?: string;
      hashtags?: string[];
      references?: string[];
      participants?: string[]; // backwards compatibility
      participantsWithMetadata?: Array<{pubkey: string; relayUrl?: string; role?: string}>;
      dTag?: string;
    }) => {
      const tags = [
        ['d', dTag || `private-date-${Date.now()}`],
        ['title', title],
        ['start', start],
      ];

      if (end) {
        tags.push(['end', end]);
      }

      // Add NIP-52 optional tags
      if (summary) tags.push(['summary', summary]);
      if (image) tags.push(['image', image]);
      
      // Handle locations - support both single and multiple per NIP-52
      if (locations && locations.length > 0) {
        locations.forEach(loc => {
          tags.push(['location', loc]);
        });
      } else if (location) {
        tags.push(['location', location]);
      }
      
      if (geohash) tags.push(['g', geohash]);
      
      // Add hashtags
      if (hashtags) {
        hashtags.forEach(hashtag => {
          tags.push(['t', hashtag]);
        });
      }
      
      // Add references
      if (references) {
        references.forEach(reference => {
          tags.push(['r', reference]);
        });
      }

      // Determine participants for private event creation
      const allParticipants = participantsWithMetadata 
        ? participantsWithMetadata.map(p => p.pubkey)
        : (participants || []);

      return publishPrivateEvent.mutateAsync({
        kind: 31922,
        content: description || '', // Ensure content is always a string
        tags,
        participants: allParticipants
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['private-calendar-events', user?.pubkey] });
    },
  });

  const publishPrivateTimeEvent = useMutation({
    mutationFn: async ({
      title,
      description,
      summary,
      image,
      start,
      end,
      location,
      locations,
      geohash,
      timezone,
      endTimezone,
      hashtags,
      references,
      participants,
      participantsWithMetadata,
      dTag
    }: {
      title: string;
      description?: string; // Make optional to handle empty content
      summary?: string;
      image?: string;
      start: number; // Unix timestamp
      end?: number;
      location?: string;
      locations?: string[];
      geohash?: string;
      timezone?: string;
      endTimezone?: string;
      hashtags?: string[];
      references?: string[];
      participants?: string[]; // backwards compatibility
      participantsWithMetadata?: Array<{pubkey: string; relayUrl?: string; role?: string}>;
      dTag?: string;
    }) => {
      const tags = [
        ['d', dTag || `private-time-${Date.now()}`],
        ['title', title],
        ['start', start.toString()],
      ];

      if (end) {
        tags.push(['end', end.toString()]);
      }

      // Add NIP-52 optional tags
      if (summary) tags.push(['summary', summary]);
      if (image) tags.push(['image', image]);
      
      // Handle locations - support both single and multiple per NIP-52
      if (locations && locations.length > 0) {
        locations.forEach(loc => {
          tags.push(['location', loc]);
        });
      } else if (location) {
        tags.push(['location', location]);
      }
      
      if (geohash) tags.push(['g', geohash]);
      
      // Add hashtags
      if (hashtags) {
        hashtags.forEach(hashtag => {
          tags.push(['t', hashtag]);
        });
      }
      
      // Add references
      if (references) {
        references.forEach(reference => {
          tags.push(['r', reference]);
        });
      }

      // Add timezone tags
      if (timezone) {
        tags.push(['start_tzid', timezone]);
      }
      if (endTimezone) {
        tags.push(['end_tzid', endTimezone]);
      } else if (timezone) {
        // If no end timezone specified, use start timezone
        tags.push(['end_tzid', timezone]);
      }

      // Determine participants for private event creation
      const allParticipants = participantsWithMetadata 
        ? participantsWithMetadata.map(p => p.pubkey)
        : (participants || []);

      return publishPrivateEvent.mutateAsync({
        kind: 31923,
        content: description || '', // Ensure content is always a string (required for 31923)
        tags,
        participants: allParticipants
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['private-calendar-events', user?.pubkey] });
    },
  });

  return {
    publishPrivateEvent: publishPrivateEvent.mutate,
    publishPrivateDateEvent: publishPrivateDateEvent.mutate,
    publishPrivateTimeEvent: publishPrivateTimeEvent.mutate,
    isPublishing: publishPrivateEvent.isPending || publishPrivateDateEvent.isPending || publishPrivateTimeEvent.isPending,
    error: publishPrivateEvent.error || publishPrivateDateEvent.error || publishPrivateTimeEvent.error,
  };
}

