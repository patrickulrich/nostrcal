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
      
      // Check if current relays are a superset of published relays
      // This indicates user manually added relays beyond their published list
      const currentIsSuperset = userRelayUrls.every(url => currentRelays.includes(url)) && 
                               currentRelays.length >= userRelayUrls.length;
      
      // Only update if no manual configuration has been done yet
      if (!hasUpdatedConfig.current) {
        lastConfiguredRelays.current = userRelayUrls;
        hasUpdatedConfig.current = true;
        updateConfig(prev => ({
          ...prev,
          relayUrls: userRelayUrls
        }));
      } else if (currentIsSuperset && currentRelays.length > userRelayUrls.length) {
        // User manually added relays beyond published list, preserve them
        // Update our tracking to current relays to prevent future resets
        lastConfiguredRelays.current = currentRelays;
      }
    } else if (!hasGeneralRelays && !isLoading && !hasUpdatedConfig.current) {
      // Only set defaults if we haven't configured relays yet
      // This prevents overriding manually added relays
      const defaultRelays = [
        "wss://relay.nostrcal.com",
        "wss://relay.primal.net",
        "wss://relay.damus.io",
        "wss://nos.lol"
      ];
      
      const hasAnyRelays = currentRelays.length > 0;

      if (!hasAnyRelays) {
        lastConfiguredRelays.current = defaultRelays;
        hasUpdatedConfig.current = true;
        updateConfig(prev => ({
          ...prev,
          relayUrls: defaultRelays
        }));
      } else {
        // Mark as configured to prevent future default overrides
        hasUpdatedConfig.current = true;
        lastConfiguredRelays.current = currentRelays;
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