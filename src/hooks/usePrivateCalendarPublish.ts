import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useRelayPreferences } from '@/hooks/useRelayPreferences';
// import { usePrivateCalendarEvents } from '@/hooks/usePrivateCalendarEvents';
import { useNostr } from '@nostrify/react';
import { 
  createRumor, 
  createGiftWrapsForRecipients, 
  extractParticipants 
} from '@/utils/nip59';
import { getWriteRelays } from '@/utils/relay-preferences';

/**
 * Hook for publishing private calendar events
 */
export function usePrivateCalendarPublish() {
  const { nostr } = useNostr();
  const { user } = useCurrentUser();
  const { preferences } = useRelayPreferences();
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

      console.log('🔨 Creating rumor with tags:', eventTags);

      // Create the unsigned calendar event (rumor)
      const rumor = await createRumor({
        kind,
        content,
        tags: eventTags,
        created_at: Math.floor(Date.now() / 1000)
      }, user.signer);

      console.log('📝 Created rumor:', {
        id: rumor.id,
        kind: rumor.kind,
        pubkey: rumor.pubkey,
        tags: rumor.tags,
        content: rumor.content,
        created_at: rumor.created_at
      });

      // Extract all participants (including creator)
      const allParticipants = extractParticipants(rumor);
      console.log('👥 All participants (including creator):', allParticipants);

      // Create gift wraps for all participants
      console.log('🎁 Creating gift wraps for participants...');
      const giftWraps = await createGiftWrapsForRecipients(
        rumor,
        user.signer,
        allParticipants
      );

      console.log('📦 Created gift wraps:', giftWraps.length, 'wraps');
      giftWraps.forEach((wrap, i) => {
        console.log(`  Gift wrap ${i + 1}:`, {
          id: wrap.id,
          kind: wrap.kind,
          pubkey: wrap.pubkey,
          tags: wrap.tags,
          contentLength: wrap.content.length,
          created_at: wrap.created_at
        });
      });

      // Get relays to publish to
      const writeRelays = getWriteRelays(preferences);
      console.log('📡 Write relays:', writeRelays);

      // Publish each gift wrap
      console.log('📤 Publishing gift wraps:', giftWraps.length);
      
      for (const giftWrap of giftWraps) {
        try {
          console.log('🎁 Publishing gift wrap:', {
            id: giftWrap.id,
            kind: giftWrap.kind,
            pubkey: giftWrap.pubkey,
            tags: giftWrap.tags,
            created_at: giftWrap.created_at
          });
          await nostr.event(giftWrap);
          console.log(`✅ Published private event to participant: ${giftWrap.tags.find(t => t[0] === 'p')?.[1]}`);
        } catch (error) {
          console.error('❌ Failed to publish gift wrap:', error);
        }
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
      geohash,
      hashtags,
      references,
      participants,
      dTag
    }: {
      title: string;
      description: string;
      summary?: string;
      image?: string;
      start: string; // YYYY-MM-DD format
      end?: string;
      location?: string;
      geohash?: string;
      hashtags?: string[];
      references?: string[];
      participants: string[];
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
      if (location) tags.push(['location', location]);
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

      return publishPrivateEvent.mutateAsync({
        kind: 31922,
        content: description,
        tags,
        participants
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
      geohash,
      timezone,
      endTimezone,
      hashtags,
      references,
      participants,
      dTag
    }: {
      title: string;
      description: string;
      summary?: string;
      image?: string;
      start: number; // Unix timestamp
      end?: number;
      location?: string;
      geohash?: string;
      timezone?: string;
      endTimezone?: string;
      hashtags?: string[];
      references?: string[];
      participants: string[];
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
      if (location) tags.push(['location', location]);
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

      return publishPrivateEvent.mutateAsync({
        kind: 31923,
        content: description,
        tags,
        participants
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

