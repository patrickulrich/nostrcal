import { useNostr } from '@nostrify/react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCurrentUser } from './useCurrentUser';
import { useNostrPublish } from './useNostrPublish';
import type { NostrEvent, NostrFilter } from '@nostrify/nostrify';

export interface Reaction {
  id: string;
  pubkey: string;
  content: string; // The reaction emoji/content (+, -, emoji, etc.)
  created_at: number;
  targetEventId: string;
}

export interface ReactionSummary {
  likes: number;
  dislikes: number;
  emojis: { [emoji: string]: number };
  userReaction?: Reaction;
  totalReactions: number;
}

/**
 * Hook to query reactions for a specific event
 */
export function useReactions(eventId: string) {
  const { nostr } = useNostr();
  const { user } = useCurrentUser();

  return useQuery({
    queryKey: ['reactions', eventId],
    queryFn: async (c) => {
      if (!eventId) return null;

      const filter: NostrFilter = {
        kinds: [7], // NIP-25 reaction events
        '#e': [eventId],
        limit: 500,
      };

      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(5000)]);
      const events = await nostr.query([filter], { signal });

      // Convert events to reaction objects
      const reactions: Reaction[] = events.map(event => ({
        id: event.id,
        pubkey: event.pubkey,
        content: event.content || '+', // Default to like if empty
        created_at: event.created_at,
        targetEventId: eventId,
      }));

      // Calculate summary
      const summary: ReactionSummary = {
        likes: 0,
        dislikes: 0,
        emojis: {},
        totalReactions: reactions.length,
        userReaction: undefined,
      };

      reactions.forEach(reaction => {
        // Check if this is the current user's reaction
        if (user?.pubkey === reaction.pubkey) {
          summary.userReaction = reaction;
        }

        // Categorize reactions
        if (reaction.content === '+' || reaction.content === '') {
          summary.likes++;
        } else if (reaction.content === '-') {
          summary.dislikes++;
        } else {
          // Emoji or custom reaction
          summary.emojis[reaction.content] = (summary.emojis[reaction.content] || 0) + 1;
        }
      });

      return {
        reactions,
        summary,
      };
    },
    enabled: !!eventId,
  });
}

/**
 * Hook to publish a reaction to an event
 */
export function usePublishReaction() {
  const { user } = useCurrentUser();
  const { mutateAsync: publishEvent } = useNostrPublish();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      targetEvent, 
      content, 
      relayHint 
    }: { 
      targetEvent: NostrEvent; 
      content: string; 
      relayHint?: string; 
    }) => {
      if (!user) {
        throw new Error('User not logged in');
      }

      // Build tags according to NIP-25
      const tags: string[][] = [
        ['e', targetEvent.id, relayHint || '', targetEvent.pubkey],
        ['p', targetEvent.pubkey, relayHint || ''],
        ['k', targetEvent.kind.toString()],
      ];

      // For addressable events, add 'a' tag
      if (targetEvent.kind >= 30000 && targetEvent.kind < 40000) {
        const dTag = targetEvent.tags.find(([name]) => name === 'd')?.[1] || '';
        tags.push(['a', `${targetEvent.kind}:${targetEvent.pubkey}:${dTag}`, relayHint || '']);
      }

      const reactionEvent = await publishEvent({
        kind: 7,
        content,
        tags,
        created_at: Math.floor(Date.now() / 1000),
      });

      return reactionEvent;
    },
    onSuccess: (_, variables) => {
      // Invalidate reactions query for the target event
      queryClient.invalidateQueries({ 
        queryKey: ['reactions', variables.targetEvent.id] 
      });
    },
  });
}

/**
 * Hook to remove a reaction (by creating a deletion event)
 */
export function useRemoveReaction() {
  const { user } = useCurrentUser();
  const { mutateAsync: publishEvent } = useNostrPublish();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      reactionId, 
      targetEventId: _targetEventId 
    }: { 
      reactionId: string; 
      targetEventId: string; 
    }) => {
      if (!user) {
        throw new Error('User not logged in');
      }

      // Create NIP-09 deletion event for the reaction
      const deletionEvent = await publishEvent({
        kind: 5,
        content: 'Deleted reaction',
        tags: [['e', reactionId]],
        created_at: Math.floor(Date.now() / 1000),
      });

      return deletionEvent;
    },
    onSuccess: (_, variables) => {
      // Invalidate reactions query for the target event
      queryClient.invalidateQueries({ 
        queryKey: ['reactions', variables.targetEventId] 
      });
    },
  });
}

/**
 * Common reaction emojis for quick selection
 */
export const COMMON_REACTIONS = [
  { emoji: '+', label: 'Like' },
  { emoji: '❤️', label: 'Love' },
  { emoji: '👍', label: 'Thumbs up' },
  { emoji: '😂', label: 'Laugh' },
  { emoji: '😢', label: 'Sad' },
  { emoji: '😮', label: 'Wow' },
  { emoji: '😡', label: 'Angry' },
  { emoji: '🔥', label: 'Fire' },
  { emoji: '🎉', label: 'Celebrate' },
  { emoji: '-', label: 'Dislike' },
];