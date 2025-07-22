import React, { useEffect, useRef, useCallback } from 'react';
import { NostrEvent, NPool, NRelay1 } from '@nostrify/nostrify';
import { NostrContext } from '@nostrify/react';
import { useNostrLogin, NUser } from '@nostrify/react/login';
import { useQueryClient } from '@tanstack/react-query';
import { useAppContext } from '@/hooks/useAppContext';
// import { createAuthEvent, normalizeRelayUrl } from '@/utils/nostr-auth';
import { authSessionManager } from '@/utils/auth-session-manager';

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
  const getCurrentUser = useCallback(() => {
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
  }, [logins]);

  // Create NPool instance only once
  const pool = useRef<NPool | undefined>(undefined);
  
  // Session management is handled by authSessionManager

  // Use refs so the pool always has the latest data
  const relayUrls = useRef<string[]>(config.relayUrls || []);

  // Update refs when config changes
  useEffect(() => {
    relayUrls.current = config.relayUrls || [];
    queryClient.resetQueries();
  }, [config.relayUrls, queryClient]);

  // Reset auth sessions when login changes
  useEffect(() => {
    const _currentUser = getCurrentUser();
    
    // Reset all auth sessions on login change
    authSessionManager.reset();
  }, [logins, getCurrentUser]);

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
              console.error('❌ [Auth] No user signer available during auth challenge');
              throw new Error('No user signer available');
            }
            
            try {
              const authEvent = await authSessionManager.authenticate(url, challenge, currentUser.signer);
              if (!authEvent) {
                throw new Error('Authentication failed: no auth event returned');
              }
              return authEvent;
            } catch (error) {
              console.error('❌ [Auth] Session authentication failed:', error);
              throw error;
            }
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