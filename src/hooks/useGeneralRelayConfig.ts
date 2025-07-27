import { useAppContext } from '@/hooks/useAppContext';
import { GeneralRelayConfig } from '@/contexts/AppContext';

/**
 * Hook for managing general relays with NIP-65 read/write permissions
 * Provides backward compatibility with legacy relayUrls config
 */
export function useGeneralRelayConfig() {
  const { config, updateConfig } = useAppContext();

  /**
   * Get effective general relays with read/write permissions
   * Migrates legacy relayUrls to new format if needed
   */
  const getEffectiveGeneralRelays = (): GeneralRelayConfig[] => {
    // If we have the new format, use it
    if (config.generalRelays && config.generalRelays.length > 0) {
      return config.generalRelays;
    }

    // Otherwise, migrate from legacy relayUrls (defaulting to read+write)
    return (config.relayUrls || []).map(url => ({
      url,
      read: true,
      write: true
    }));
  };

  /**
   * Update general relays and maintain backward compatibility
   */
  const updateGeneralRelays = (relays: GeneralRelayConfig[]) => {
    updateConfig(prev => ({
      ...prev,
      generalRelays: relays,
      // Also update legacy relayUrls for backward compatibility
      relayUrls: relays.map(r => r.url)
    }));
  };

  /**
   * Add a new general relay
   */
  const addGeneralRelay = (url: string, read = true, write = true) => {
    const currentRelays = getEffectiveGeneralRelays();
    
    // Check if already exists
    if (currentRelays.some(r => r.url === url)) {
      throw new Error('Relay already exists');
    }

    const newRelays = [...currentRelays, { url, read, write }];
    updateGeneralRelays(newRelays);
  };

  /**
   * Remove a general relay
   */
  const removeGeneralRelay = (url: string) => {
    const currentRelays = getEffectiveGeneralRelays();
    
    // Don't allow removing the last relay
    if (currentRelays.length <= 1) {
      throw new Error('Cannot remove the last relay');
    }

    const newRelays = currentRelays.filter(r => r.url !== url);
    updateGeneralRelays(newRelays);
  };

  /**
   * Toggle read or write permission for a relay
   */
  const toggleRelayPermission = (url: string, permission: 'read' | 'write') => {
    const currentRelays = getEffectiveGeneralRelays();
    
    const newRelays = currentRelays.map(relay => {
      if (relay.url === url) {
        return {
          ...relay,
          [permission]: !relay[permission]
        };
      }
      return relay;
    });

    updateGeneralRelays(newRelays);
  };

  return {
    generalRelays: getEffectiveGeneralRelays(),
    updateGeneralRelays,
    addGeneralRelay,
    removeGeneralRelay,
    toggleRelayPermission,
  };
}