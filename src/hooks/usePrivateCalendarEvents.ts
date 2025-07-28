import { useMutation } from '@tanstack/react-query';
import { useNostr } from '@nostrify/react';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useRelayPreferences } from '@/hooks/useRelayPreferences';
import { useAppContext } from '@/hooks/useAppContext';
import { useState, useEffect, useMemo } from 'react';
import { 
  unwrapPrivateEventWithSigner,
  createGiftWrapsForRecipients, 
  extractParticipants,
  isCalendarRumor,
  isGiftWrap,
  createRumor,
  Rumor,
  publishGiftWrapsToParticipants
} from '@/utils/nip59';
import { getParticipantRelayPreferences, getReadRelays } from '@/utils/relay-preferences';
import { NostrEvent } from '@nostrify/nostrify';

/**
 * Hook to manage private calendar events
 */
export function usePrivateCalendarEvents() {
  const { nostr } = useNostr();
  const { user, isLoading: isUserLoading } = useCurrentUser();
  const { preferences: _preferences, isLoading: isLoadingPreferences } = useRelayPreferences();
  const { config: _config } = useAppContext();
  const [privateEvents, setPrivateEvents] = useState<Rumor[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastUserPubkey, setLastUserPubkey] = useState<string | null>(null);

  // Memoize read relays to prevent infinite re-renders
  const readRelays = useMemo(() => {
    return getReadRelays(_preferences);
  }, [_preferences]);

  // Stream private events as they're decrypted
  useEffect(() => {
    // Wait for user loading to complete (handles nsec race condition)
    if (isUserLoading) {
      return;
    }

    // If no user logged in, no private events to show
    if (!user?.pubkey || !user?.signer) {
      // Only update state if it needs to change to prevent infinite re-renders
      setPrivateEvents(prev => prev.length > 0 ? [] : prev);
      setLastUserPubkey(prev => prev !== null ? null : prev);
      return;
    }

    // ✅ Wait for relay preferences to load before starting private event stream
    if (isLoadingPreferences) {
      return;
    }

    // Only clear events when user changes
    if (lastUserPubkey !== user.pubkey) {
      setPrivateEvents([]);
      setLastUserPubkey(user.pubkey);
    }

    let isMounted = true;
    const controller = new AbortController();

    const startStreaming = async () => {
      try {
        setIsProcessing(true);

        const filter = {
          kinds: [1059], // Gift wrapped events
          "#p": [user.pubkey], // Tagged for this user
          limit: 100 // Reduced limit for faster initial load
        };


        // Use memoized read relays from user's 10050 preferences

        // Start private events subscription

        const subscription = nostr.req([filter], { 
          signal: controller.signal,
          relays: readRelays
        });


        const processedIds = new Set<string>();
        let _eventCount = 0;
        let decryptedCount = 0;

        // ✅ CORRECT: Handle relay messages properly
        for await (const msg of subscription) {
          if (!isMounted) {
            break;
          }
          
          
          // Handle different message types
          if (msg[0] === 'EVENT') {
            const event = msg[2]; // ✅ Extract actual event from msg[2]
            _eventCount++;
            
            // Process received event
            
            if (!isGiftWrap(event)) {
              continue;
            }
            
            if (processedIds.has(event.id)) {
              continue;
            }
            
            processedIds.add(event.id);

            // Process decryption asynchronously to not block the stream
            (async () => {
              try {
                // Attempt to decrypt event
                
                const rumor = await unwrapPrivateEventWithSigner(event, user.signer!);
                
                if (rumor && rumor.id && isCalendarRumor(rumor) && isMounted) {
                  decryptedCount++;
                  // Add decrypted calendar event
                  
                  // Add the decrypted event immediately for real-time streaming
                  setPrivateEvents(prev => {
                    // Avoid duplicates
                    if (prev.some(existing => existing.id === rumor.id)) {
                      return prev;
                    }
                    return [...prev, rumor].sort((a, b) => b.created_at - a.created_at);
                  });
                  
                  // Mark as no longer loading after first decrypted event
                  if (decryptedCount === 1) {
                    setIsProcessing(false);
                  }
                }
              } catch (error) {
                console.log('[PrivateEvents] Decryption failed for event:', { 
                  eventId: event.id, 
                  error: error instanceof Error ? error.message : 'Unknown error',
                  timestamp: Date.now()
                });
              }
            })();
            
          } else if (msg[0] === 'EOSE') {
            // End of stored events - give a brief moment for any pending decryptions
            setTimeout(() => {
              if (isMounted) {
                setIsProcessing(false);
              }
            }, 500); // Brief delay to allow pending decryptions to complete
          } else if (msg[0] === 'CLOSED') {
            // Subscription closed
            break;
          }
        }
        
        
        
        if (isMounted) {
          setIsProcessing(false);
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          console.error('Private calendar events stream error:', error);
        }
        if (isMounted) {
          setIsProcessing(false);
        }
      }
    };

    startStreaming();

    // Cleanup
    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [user?.pubkey, user?.signer, nostr, readRelays, lastUserPubkey, isLoadingPreferences, isUserLoading]);

  // Wrap in a query-like interface for compatibility
  const query = {
    data: privateEvents,
    isLoading: isProcessing || isLoadingPreferences, // Include relay preferences loading
    error: null,
    isError: false,
    isSuccess: !isProcessing && !isLoadingPreferences
  };

  const createPrivateEvent = useMutation({
    mutationFn: async ({ 
      event, 
      participantPubkeys: _participantPubkeys 
    }: { 
      event: Partial<Omit<NostrEvent, 'id' | 'pubkey' | 'sig'>>, 
      participantPubkeys: string[] 
    }) => {
      if (!user?.signer) {
        throw new Error('User not authenticated');
      }

      // Create unsigned rumor
      const rumor = await createRumor(event, user.signer);
      
      // Extract all participants (including creator)
      const allParticipants = extractParticipants(rumor);
      
      // Create gift wraps for all participants using the signer
      const giftWraps = await createGiftWrapsForRecipients(
        rumor, 
        user.signer, 
        allParticipants
      );

      // Publish gift wraps to participants' relay preferences
      await publishGiftWrapsToParticipants(
        giftWraps,
        nostr,
        getParticipantRelayPreferences
      );
      
      return rumor;
    },
    onSuccess: () => {
      // Events will be picked up automatically by the streaming subscription
      // No need to manually trigger a re-fetch
    },
  });

  const createPrivateRSVP = useMutation({
    mutationFn: async ({ 
      originalEvent, 
      status, 
      content 
    }: { 
      originalEvent: Rumor, 
      status: 'accepted' | 'declined' | 'tentative',
      content?: string 
    }) => {
      if (!user?.signer) {
        throw new Error('User not authenticated');
      }

      // Create RSVP event
      const rsvpEvent = {
        kind: 31925,
        content: content || '',
        tags: [
          ['a', `${originalEvent.kind}:${originalEvent.pubkey}:${originalEvent.tags.find(t => t[0] === 'd')?.[1]}`],
          ['d', `rsvp-${originalEvent.id}-${Date.now()}`],
          ['status', status],
          ['p', originalEvent.pubkey]
        ],
        created_at: Math.floor(Date.now() / 1000)
      };

      // Create rumor
      const rumor = await createRumor(rsvpEvent, user.signer);
      
      // Get all participants from original event
      const participants = extractParticipants(originalEvent);
      
      // Create gift wraps for all participants
      const giftWraps = await createGiftWrapsForRecipients(
        rumor, 
        user.signer, 
        participants
      );

      // Publish gift wraps to participants' relay preferences
      await publishGiftWrapsToParticipants(
        giftWraps,
        nostr,
        getParticipantRelayPreferences
      );
      
      return rumor;
    },
    onSuccess: () => {
      // Events will be picked up automatically by the streaming subscription
      // No need to manually trigger a re-fetch
    },
  });

  return {
    privateEvents: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
    createPrivateEvent: createPrivateEvent.mutate,
    isCreating: createPrivateEvent.isPending,
    createError: createPrivateEvent.error,
    createPrivateRSVP: createPrivateRSVP.mutate,
    isCreatingRSVP: createPrivateRSVP.isPending,
    rsvpError: createPrivateRSVP.error,
  };
}

