import { useAppContext } from '@/hooks/useAppContext';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useGeneralRelayList } from '@/hooks/useGeneralRelayList';

/**
 * Hook to get effective relay URLs for general app usage
 * 
 * Uses hardcoded defaults to query for user's kind 10002 general relay list.
 * If user has published general relays, use those instead of defaults.
 * If no user or no published list, use hardcoded defaults.
 */
export function useEffectiveRelays() {
  const { config } = useAppContext();
  const { user } = useCurrentUser();
  const { generalRelays, isLoading, hasGeneralRelays } = useGeneralRelayList();

  // If no user is logged in, use app defaults
  if (!user?.pubkey) {
    return {
      relayUrls: config.relayUrls || [],
      isLoading: false,
      usingUserPreferences: false,
      source: 'hardcoded-defaults'
    };
  }

  // If still loading user preferences, use app defaults temporarily
  if (isLoading) {
    return {
      relayUrls: config.relayUrls || [],
      isLoading: true,
      usingUserPreferences: false,
      source: 'hardcoded-defaults'
    };
  }

  // If user has published general relay list (kind 10002), use those
  if (hasGeneralRelays && generalRelays) {
    const userRelayUrls = generalRelays.map(relay => relay.url);
    return {
      relayUrls: userRelayUrls,
      isLoading: false,
      usingUserPreferences: true,
      source: 'kind-10002'
    };
  }

  // User doesn't have published general relay list, use app defaults
  return {
    relayUrls: config.relayUrls || [],
    isLoading: false,
    usingUserPreferences: false,
    source: 'hardcoded-defaults'
  };
}