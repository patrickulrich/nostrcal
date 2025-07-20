import React, { useEffect, useRef } from 'react';
import { NostrEvent, NPool, NRelay1 } from '@nostrify/nostrify';
import { NostrContext } from '@nostrify/react';
import { useNostrLogin, NUser } from '@nostrify/react/login';
import { useQueryClient } from '@tanstack/react-query';
import { useAppContext } from '@/hooks/useAppContext';
import { createAuthEvent, normalizeRelayUrl } from '@/utils/nostr-auth';

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
  const { logins } = useNostrLogin();

  const queryClient = useQueryClient();

  // Helper function to get current user from logins
  const getCurrentUser = () => {
    if (logins.length === 0) {
      return null;
    }
    
    const login = logins[0];
    try {
      let user: NUser | null = null;
      switch (login.type) {
        case 'nsec':
          user = NUser.fromNsecLogin(login);
          break;
        case 'extension':
          user = NUser.fromExtensionLogin(login);
          break;
        case 'bunker':
          // For bunker login, create user with the nostr instance if available
          if (pool.current) {
            user = NUser.fromBunkerLogin(login, pool.current);
          } else {
            console.warn('[NostrProvider] Bunker login attempted but nostr pool not available');
            return null;
          }
          break;
        default:
          console.warn(`[NostrProvider] Unsupported login type: ${login.type}`);
          return null;
      }
      
      if (user?.signer) {
        return user;
      } else {
        console.warn('[NostrProvider] User created but no signer available');
        return null;
      }
    } catch (error) {
      console.error('[NostrProvider] Failed to create user from login:', error);
      return null;
    }
  };

  // Create NPool instance only once
  const pool = useRef<NPool | undefined>(undefined);
  
  // Track authenticated relays to avoid spam
  const _authenticatedRelays = useRef<Set<string>>(new Set());

  // Use refs so the pool always has the latest data
  const relayUrls = useRef<string[]>(config.relayUrls || []);

  // Update refs when config changes
  useEffect(() => {
    relayUrls.current = config.relayUrls || [];
    queryClient.resetQueries();
  }, [config.relayUrls, queryClient]);

  // Initialize NPool only once
  if (!pool.current) {
    pool.current = new NPool({
      open(url: string) {
        const relayOptions: { auth?: (challenge: string) => Promise<NostrEvent> } = {};
        
        // Add authentication if enabled and user is logged in
        if (config.enableAuth) {
          relayOptions.auth = async (challenge: string) => {
            const currentUser = getCurrentUser();
            if (!currentUser?.signer) {
              throw new Error('No user signer available');
            }
            
            const normalizedUrl = normalizeRelayUrl(url);
            const authEvent = await createAuthEvent(challenge, normalizedUrl, currentUser.signer);
            return authEvent;
          };
        }
        
        const relay = new NRelay1(url, relayOptions);
        
        // Add connection logging
        // Connection event handlers - accessing socket due to type limitations
        const socket = (relay as unknown as { socket?: WebSocket }).socket;
        socket?.addEventListener('open', () => {
          // Connection established
        });
        
        socket?.addEventListener('close', () => {
          // Connection closed
        });
        
        socket?.addEventListener('error', () => {
          // Connection error
        });
        
        return relay;
      },
      reqRouter(filters) {
        // Query all configured relays
        const relayMap = new Map();
        for (const url of relayUrls.current) {
          relayMap.set(url, filters);
        }
        return relayMap;
      },
      eventRouter(_event: NostrEvent) {
        // Publish to all configured relays
        const allRelays = new Set<string>(relayUrls.current);

        // Also publish to the preset relays, capped to 5 total
        for (const { url } of (presetRelays ?? [])) {
          allRelays.add(url);

          if (allRelays.size >= 5) {
            break;
          }
        }

        return [...allRelays];
      },
    });
  }

  // Expose pool for debugging
  useEffect(() => {
    if (pool.current) {
      window.nostrPool = pool.current;
      window.getRelayStatus = () => {
        const relays = pool.current?.relays;
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
    }
  }, []);

  return (
    <NostrContext.Provider value={{ nostr: pool.current }}>
      {children}
    </NostrContext.Provider>
  );
};

export default NostrProvider;