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
  const { user } = useCurrentUser();
  const { preferences: _preferences } = useRelayPreferences();
  const { config: _config } = useAppContext();
  const [privateEvents, setPrivateEvents] = useState<Rumor[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastUserPubkey, setLastUserPubkey] = useState<string | null>(null);

  // Memoize read relays to prevent infinite re-renders
  const readRelays = useMemo(() => {
    return getReadRelays(_preferences);
  }, [_preferences]);

  // Stream private events as they're decrypted - start immediately when user is available  
  useEffect(() => {
    // If no user logged in, no private events to show
    if (!user?.pubkey || !user?.signer) {
      // Only update state if it needs to change to prevent infinite re-renders  
      setPrivateEvents(prev => prev.length > 0 ? [] : prev);
      setLastUserPubkey(prev => prev !== null ? null : prev);
      return;
    }

    // Start immediately with default relays - don't wait for relay preferences
    // Relay preferences will be used when available for optimization

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

        // First, load cached private events
        try {
          const cachedEvents = await import('@/lib/indexeddb').then(({ getCachedPrivateEvents }) => 
            getCachedPrivateEvents(user.pubkey)
          );
          
          // Decrypt cached events and add to state
          for (const cachedEvent of cachedEvents) {
            try {
              // Decrypt the cached wrapper event (same as from relay)
              const rumor = await unwrapPrivateEventWithSigner(cachedEvent.wrapper_event, user.signer!);
              
              if (rumor && isCalendarRumor(rumor) && isMounted) {
                setPrivateEvents(prev => {
                  // Avoid duplicates
                  if (prev.some(existing => existing.id === rumor.id)) {
                    return prev;
                  }
                  return [...prev, rumor].sort((a, b) => b.created_at - a.created_at);
                });
              }
            } catch (error) {
              console.warn('[PrivateEvents] Failed to decrypt cached event:', error);
            }
          }
          
          if (cachedEvents.length > 0) {
            setIsProcessing(false); // Show cached events immediately
          }
        } catch (error) {
          console.warn('[PrivateEvents] Failed to load cached events:', error);
        }

        const filter = {
          kinds: [1059], // Gift wrapped events
          "#p": [user.pubkey], // Tagged for this user
          limit: 100 // Reduced limit for faster initial load
        };


        // Use read relays if available, otherwise use default relays for immediate start
        const relaysToUse = readRelays.length > 0 ? readRelays : undefined; // Let NostrProvider use defaults

        // Start private events subscription  
        const subscription = nostr.req([filter], { 
          signal: controller.signal,
          relays: relaysToUse
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
                  
                  // Cache the encrypted wrapper event (non-blocking)
                  try {
                    import('@/lib/indexeddb').then(({ cachePrivateEvent }) => {
                      // Store the kind 1059 wrapper event - we'll decrypt it again when loading from cache
                      cachePrivateEvent(rumor.id, event.content, event, user.pubkey).catch(error => {
                        console.warn('[PrivateEvents] Failed to cache private event:', error);
                      });
                    });
                  } catch (error) {
                    // Don't block if caching fails
                    console.warn('[PrivateEvents] Failed to cache private event:', error);
                  }
                  
                  // Mark as no longer loading after first decrypted event
                  if (decryptedCount === 1) {
                    setIsProcessing(false);
                  }
                }
              } catch {
                // Silently handle decryption failures
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
  }, [user?.pubkey, user?.signer, nostr, readRelays, lastUserPubkey]); // Removed loading dependencies for immediate start

  // Wrap in a query-like interface for compatibility
  const query = {
    data: privateEvents,
    isLoading: isProcessing, // Removed relay preferences loading for immediate start
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

