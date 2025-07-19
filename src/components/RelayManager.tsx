import { useEffect, useRef } from 'react';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useGeneralRelayList } from '@/hooks/useGeneralRelayList';
import { useAppContext } from '@/hooks/useAppContext';
import { useAuthor } from '@/hooks/useAuthor';

/**
 * Component that manages relay configuration and profile preloading
 * 
 * This component:
 * 1. Uses hardcoded defaults initially
 * 2. Queries for user's kind 10002 general relay list
 * 3. Updates app config to use user's relays if available
 * 4. Preloads user's profile (kind 0) on login for immediate availability
 */
export function RelayManager({ children }: { children: React.ReactNode }) {
  const { user } = useCurrentUser();
  const { generalRelays, hasGeneralRelays, isLoading } = useGeneralRelayList();
  const { config, updateConfig } = useAppContext();
  
  // Preload user's profile on login
  const _userProfile = useAuthor(user?.pubkey);
  
  // Track previous state to prevent loops
  const lastConfiguredRelays = useRef<string[]>([]);
  const hasUpdatedConfig = useRef(false);

  useEffect(() => {
    if (!user?.pubkey || isLoading) {
      return;
    }

    const currentRelays = config.relayUrls || [];
    
    // Skip if we've already configured this user's relays
    if (hasUpdatedConfig.current && 
        JSON.stringify(currentRelays.sort()) === JSON.stringify(lastConfiguredRelays.current.sort())) {
      return;
    }

    if (hasGeneralRelays && generalRelays) {
      // User has published general relay list (kind 10002)
      const userRelayUrls = generalRelays.map(relay => relay.url);
      
      // Only update if the relays are different from current config
      const relaysChanged = userRelayUrls.length !== currentRelays.length ||
        userRelayUrls.some(url => !currentRelays.includes(url));

      if (relaysChanged) {
        lastConfiguredRelays.current = userRelayUrls;
        hasUpdatedConfig.current = true;
        updateConfig(prev => ({
          ...prev,
          relayUrls: userRelayUrls
        }));
      }
    } else if (!hasGeneralRelays && !isLoading) {
      // User doesn't have published relay list, ensure we're using defaults
      const defaultRelays = [
        "wss://relay.nostrcal.com",
        "wss://relay.primal.net",
        "wss://relay.damus.io",
        "wss://nos.lol"
      ];
      
      const usingDefaults = defaultRelays.every(url => currentRelays.includes(url)) &&
        currentRelays.length === defaultRelays.length;

      if (!usingDefaults) {
        lastConfiguredRelays.current = defaultRelays;
        hasUpdatedConfig.current = true;
        updateConfig(prev => ({
          ...prev,
          relayUrls: defaultRelays
        }));
      }
    }
  }, [user?.pubkey, hasGeneralRelays, generalRelays, isLoading, config.relayUrls, updateConfig]);

  // Reset tracking when user changes
  useEffect(() => {
    hasUpdatedConfig.current = false;
    lastConfiguredRelays.current = [];
  }, [user?.pubkey]);


  return <>{children}</>;
}