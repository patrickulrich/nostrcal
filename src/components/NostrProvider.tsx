import React, { useEffect, useRef, useState, useMemo } from 'react';
import { NostrEvent, NPool, NRelay1 } from '@nostrify/nostrify';
import { NostrContext } from '@nostrify/react';
import { useQueryClient } from '@tanstack/react-query';
import { useAppContext } from '@/hooks/useAppContext';
// import { createAuthEvent, normalizeRelayUrl } from '@/utils/nostr-auth';
import { authSessionManager } from '@/utils/auth-session-manager';
import { getAuthorRelayListMetadata as _getAuthorRelayListMetadata, getWriteRelays as _getWriteRelays } from '@/utils/relay-preferences';
import { relayCache } from '@/utils/relay-cache';

// Global relay status for debugging
declare global {
  interface Window {
    nostrPool?: NPool;
    getRelayStatus?: () => Array<{url: string; readyState: number; readyStateText: string; bufferedAmount: number}> | string;
  }
}


interface NostrProviderProps {
  children: React.ReactNode;
}

const NostrProvider: React.FC<NostrProviderProps> = (props) => {
  const { children } = props;
  const { config, presetRelays } = useAppContext();
  const [_currentPubkey, setCurrentPubkey] = useState<string | undefined>();

  const queryClient = useQueryClient();

  // Use refs so the pool always has the latest data
  const relayUrls = useRef<string[]>(config.relayUrls || []);
  const signerRef = useRef<typeof window.nostr | null>(null);

  // Create pool first, then use it for bunker users
  const pool = useMemo(() => new NPool({
    open(url: string) {
      const relayOptions: { auth?: (challenge: string) => Promise<NostrEvent> } = {};
      
      // Add authentication if enabled and signer is available
      if (config.enableAuth && (signerRef.current || window.nostr)) {
        relayOptions.auth = async (challenge: string) => {
          
          // Use the proper signer from signerRef or create adapter from window.nostr
          let signer = signerRef.current;
          
          if (!signer && window.nostr) {
            // Create signer adapter from window.nostr for bunker/extension compatibility
            signer = {
              getPublicKey: () => window.nostr!.getPublicKey(),
              signEvent: (event) => window.nostr!.signEvent(event),
              nip44: window.nostr!.nip44 ? {
                encrypt: (pubkey, plaintext) => window.nostr!.nip44!.encrypt(pubkey, plaintext),
                decrypt: (pubkey, ciphertext) => window.nostr!.nip44!.decrypt(pubkey, ciphertext),
              } : undefined,
              nip04: window.nostr!.nip04 ? {
                encrypt: (pubkey, plaintext) => window.nostr!.nip04!.encrypt(pubkey, plaintext),
                decrypt: (pubkey, ciphertext) => window.nostr!.nip04!.decrypt(pubkey, ciphertext),
              } : undefined,
            };
          }
          
          if (signer) {
            const authEvent = await authSessionManager.authenticate(url, challenge, signer as any);
            if (!authEvent) {
              throw new Error('Authentication failed: no auth event returned');
            }
            return authEvent;
          }
          
          throw new Error('No signer available');
        };
      }
      
      const relay = new NRelay1(url, relayOptions);
      
      
      // Add connection logging
      // Connection event handlers - accessing socket due to type limitations
      const socket = (relay as unknown as { socket?: WebSocket }).socket;
      socket?.addEventListener('open', () => {
      });
      
      socket?.addEventListener('close', (event) => {
        const closeInfo = {
          url,
          code: (event as any).code,
          reason: (event as any).reason,
          wasClean: (event as any).wasClean,
          timestamp: Date.now()
        };
        
        
        // If connection closes unexpectedly after authentication, invalidate session
        if (!closeInfo.wasClean) {
          authSessionManager.invalidateSession(url);
        }
      });
      
      socket?.addEventListener('error', (error) => {
        console.error('❌ [Relay] Connection error:', {
          url,
          error: error,
          timestamp: Date.now()
        });
        
        // Invalidate session on connection errors
        authSessionManager.invalidateSession(url);
      });
      
      
      return relay;
    },
    reqRouter(filters) {
      // NIP-65 intelligent routing with fallback
      const relayMap = new Map();
      
      // Add configured relays as fallback for all filters
      for (const url of relayUrls.current) {
        relayMap.set(url, relayMap.get(url) || []);
        relayMap.get(url).push(...filters);
      }
      
      // NIP-65: For filters with specific authors, try to add their write relays
      for (const filter of filters) {
        if (filter.authors && Array.isArray(filter.authors) && filter.authors.length > 0) {
          for (const author of filter.authors) {
            // Use cached relay data if available (sync access to cache)
            const cachedRelays = relayCache.get(author);
            if (cachedRelays) {
              const writeRelays = cachedRelays.filter(r => r.write).map(r => r.url);
              for (const relayUrl of writeRelays) {
                relayMap.set(relayUrl, relayMap.get(relayUrl) || []);
                if (!relayMap.get(relayUrl).includes(filter)) {
                  relayMap.get(relayUrl).push(filter);
                }
              }
              // Debug: Using cached write relays
            }
          }
        }
      }
      
      return relayMap;
    },
    eventRouter(event: NostrEvent) {
      // NIP-65 compliant publishing with fallback
      const allRelays = new Set<string>(relayUrls.current);

      // Add preset relays for redundancy, capped to 5 total
      for (const { url } of (presetRelays ?? [])) {
        allRelays.add(url);
        if (allRelays.size >= 5) {
          break;
        }
      }

      // NIP-65: Add mentioned users' read relays
      const mentionedUsers = event.tags
        ?.filter(tag => tag[0] === 'p' && tag[1])
        ?.map(tag => tag[1]) || [];

      // Add mentioned users' read relays using cached data
      if (mentionedUsers.length > 0) {
        // Debug: Event mentions users for NIP-65 routing
        
        for (const mentionedUser of mentionedUsers) {
          const cachedRelays = relayCache.get(mentionedUser);
          if (cachedRelays) {
            const readRelays = cachedRelays.filter(r => r.read).map(r => r.url);
            readRelays.forEach(relay => allRelays.add(relay));
            // Debug: Adding read relays for mentioned user
          }
        }
      }

      // NIP-65: If this is not already a kind 10002 event, schedule propagation of user's relay list
      if (event.kind !== 10002) {
        // Don't propagate kind 10002 during publishing to avoid infinite loops
        // The propagation will be handled by hooks after successful event publishing
        // Debug: Event published to relays with NIP-65 routing
      }

      return [...allRelays];
    },
  }), [config.enableAuth, presetRelays]);

  // Update refs when config changes
  useEffect(() => {
    relayUrls.current = config.relayUrls || [];
    queryClient.resetQueries();
  }, [config.relayUrls, queryClient]);

  // Listen for auth changes and update signer
  useEffect(() => {
    const updateSigner = async () => {
      try {
        // Only check if window.nostr is already available to avoid bunker conflicts
        if (window.nostr && typeof window.nostr.getPublicKey === 'function') {
          try {
            const pubkey = await window.nostr.getPublicKey();
            setCurrentPubkey(pubkey);
            signerRef.current = window.nostr;
          } catch {
            // Don't log bunker-related errors as they're expected during initialization
            setCurrentPubkey(undefined);
            signerRef.current = null;
          }
        } else {
          setCurrentPubkey(undefined);
          signerRef.current = null;
        }
      } catch {
        setCurrentPubkey(undefined);
        signerRef.current = null;
      }
    };

    const handleAuth = (_e: CustomEvent) => {
      // Delay to allow nostr-login to fully initialize window.nostr
      setTimeout(() => {
        updateSigner();
      }, 100);
      // Reset all auth sessions on login change
      authSessionManager.reset();
    };

    // Don't check initial state to avoid bunker conflicts
    // Only update when we receive explicit auth events

    // Listen for auth changes
    document.addEventListener('nlAuth', handleAuth as EventListener);

    return () => {
      document.removeEventListener('nlAuth', handleAuth as EventListener);
    };
  }, []);

  // Expose pool for debugging
  useEffect(() => {
    window.nostrPool = pool;
    window.getRelayStatus = () => {
      const relays = pool.relays;
      if (!relays) return 'No relays';
      
      return Array.from(relays.entries()).map(([url, relay]) => {
        const socket = (relay as unknown as { socket?: WebSocket }).socket;
        return {
          url,
          readyState: socket?.readyState ?? 3,
          readyStateText: ['CONNECTING', 'OPEN', 'CLOSING', 'CLOSED'][socket?.readyState ?? 3],
          bufferedAmount: socket?.bufferedAmount ?? 0,
        };
      });
    };
  }, [pool]);

  return (
    <NostrContext.Provider value={{ nostr: pool }}>
      {children}
    </NostrContext.Provider>
  );
};

export default NostrProvider;