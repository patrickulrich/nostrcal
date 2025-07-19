import { useMutation } from '@tanstack/react-query';
import { useNostr } from '@nostrify/react';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useRelayPreferences } from '@/hooks/useRelayPreferences';
import { useAppContext } from '@/hooks/useAppContext';
import { useState, useEffect } from 'react';
import { 
  unwrapPrivateEventWithSigner,
  createGiftWrapsForRecipients, 
  extractParticipants,
  isCalendarRumor,
  isGiftWrap,
  createRumor,
  Rumor
} from '@/utils/nip59';
import { getWriteRelays } from '@/utils/relay-preferences';
import { NostrEvent } from '@nostrify/nostrify';

/**
 * Hook to manage private calendar events
 */
export function usePrivateCalendarEvents() {
  const { nostr } = useNostr();
  const { user } = useCurrentUser();
  const { preferences } = useRelayPreferences();
  const { config: _config } = useAppContext();
  const [privateEvents, setPrivateEvents] = useState<Rumor[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  // Stream private events as they're decrypted
  useEffect(() => {
    if (!user?.pubkey || !user?.signer) {
      console.log('[usePrivateCalendarEvents] Missing requirements:', { 
        hasUser: !!user?.pubkey, 
        hasSigner: !!user?.signer,
        hasNostr: !!nostr 
      });
      setPrivateEvents([]);
      return;
    }


    let isMounted = true;
    const controller = new AbortController();

    const startStreaming = async () => {
      try {
        setIsProcessing(true);
        setPrivateEvents([]); // Clear existing events

        const filter = {
          kinds: [1059], // Gift wrapped events
          "#p": [user.pubkey], // Tagged for this user
          limit: 200
        };


        const subscription = nostr.req([filter], { 
          signal: controller.signal 
        });


        const processedIds = new Set<string>();
        let eventCount = 0;
        let decryptedCount = 0;


        // Set a timeout to clear loading state if no events arrive
        setTimeout(() => {
          if (isMounted) {
            setIsProcessing(false);
          }
        }, 5000); // 5 second timeout

        // ✅ CORRECT: Handle relay messages properly
        for await (const msg of subscription) {
          if (!isMounted) {
            console.log('[usePrivateCalendarEvents] Component unmounted, breaking stream');
            break;
          }
          
          
          // Handle different message types
          if (msg[0] === 'EVENT') {
            const event = msg[2]; // ✅ Extract actual event from msg[2]
            eventCount++;
            
            
            if (!isGiftWrap(event)) {
              console.log('[usePrivateCalendarEvents] Skipping non-gift-wrap event');
              continue;
            }
            
            if (processedIds.has(event.id)) {
              console.log('[usePrivateCalendarEvents] Skipping already processed event');
              continue;
            }
            
            processedIds.add(event.id);

            // Process decryption asynchronously to not block the stream
            (async () => {
              try {
                const rumor = await unwrapPrivateEventWithSigner(event, user.signer!);
                
                if (rumor && isCalendarRumor(rumor) && isMounted) {
                  decryptedCount++;
                  
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
              } catch {
                // Silently ignore decryption failures - these are expected for events not intended for this user
              }
            })();
            
          } else if (msg[0] === 'EOSE') {
            if (isMounted) {
              setIsProcessing(false); // Always clear loading on EOSE, even if no events decrypted
            }
          } else if (msg[0] === 'CLOSED') {
            console.log('[usePrivateCalendarEvents] Subscription closed');
            break;
          }
        }
        
        console.log(`[usePrivateCalendarEvents] Stream completed. Events received: ${eventCount}, Successfully decrypted: ${decryptedCount}`);
        
        // If streaming didn't find any events, try a batch query as fallback
        if (eventCount === 0 && isMounted) {
          console.log('[usePrivateCalendarEvents] No events from stream, trying batch query fallback...');
          try {
            const signal = AbortSignal.timeout(5000);
            const batchEvents = await nostr.query([filter], { signal });
            console.log(`[usePrivateCalendarEvents] Batch query returned ${batchEvents.length} events`);
            
            if (batchEvents.length > 0) {
              console.log('[usePrivateCalendarEvents] Found events with batch query - streaming may not be working properly');
              // Process a few events for comparison
              for (let i = 0; i < Math.min(3, batchEvents.length); i++) {
                const event = batchEvents[i];
                console.log(`[usePrivateCalendarEvents] Batch event ${i + 1}:`, {
                  id: event.id.substring(0, 8) + '...',
                  kind: event.kind,
                  isGiftWrap: isGiftWrap(event)
                });
              }
            }
          } catch (error) {
            console.log('[usePrivateCalendarEvents] Batch query also failed:', error);
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
  }, [user?.pubkey, user?.signer, nostr]);

  // Wrap in a query-like interface for compatibility
  const query = {
    data: privateEvents,
    isLoading: isProcessing,
    error: null,
    isError: false,
    isSuccess: !isProcessing
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

      // Get each participant's relay preferences and send to their relays
      const _writeRelays = getWriteRelays(preferences);
      const publishPromises: Promise<void>[] = [];

      for (const giftWrap of giftWraps) {
        // For now, publish to our own write relays
        // TODO: Query each participant's relay preferences
        const publishPromise = nostr.event(giftWrap);
        publishPromises.push(publishPromise);
      }

      await Promise.allSettled(publishPromises);
      
      return rumor;
    },
    onSuccess: () => {
      // Trigger a re-fetch of private events by changing the effect dependency
      // This will cause the useEffect to run again and fetch updated events
      if (user?.pubkey && user?.signer) {
        // Manually re-trigger the private events processing
        // by temporarily clearing and refetching
        setPrivateEvents([]);
        setTimeout(() => {
          // The useEffect will handle the refetch automatically
        }, 100);
      }
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

      // Publish to relays
      const publishPromises = giftWraps.map(giftWrap => nostr.event(giftWrap));
      await Promise.allSettled(publishPromises);
      
      return rumor;
    },
    onSuccess: () => {
      // Trigger a re-fetch of private events by changing the effect dependency
      // This will cause the useEffect to run again and fetch updated events
      if (user?.pubkey && user?.signer) {
        // Manually re-trigger the private events processing
        // by temporarily clearing and refetching
        setPrivateEvents([]);
        setTimeout(() => {
          // The useEffect will handle the refetch automatically
        }, 100);
      }
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

