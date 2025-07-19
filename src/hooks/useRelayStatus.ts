import { useEffect, useState } from 'react';
import { useNostr } from '@nostrify/react';
import { useAppContext } from '@/hooks/useAppContext';

export interface RelayStatus {
  url: string;
  connected: boolean;
  readyState: number;
  readyStateText: string;
  lastSeen?: Date;
  readCount?: number;
  writeCount?: number;
  error?: string;
}

export function useRelayStatus() {
  const { nostr } = useNostr();
  const { config } = useAppContext();
  const [relayStatuses, setRelayStatuses] = useState<RelayStatus[]>([]);

  useEffect(() => {
    const updateStatuses = () => {
      if (!nostr?.relays || !config.relayUrls) {
        setRelayStatuses([]);
        return;
      }

      const statuses: RelayStatus[] = config.relayUrls.map(url => {
        const relay = nostr.relays.get(url);
        
        if (!relay) {
          return {
            url,
            connected: false,
            readyState: 3, // CLOSED
            readyStateText: 'CLOSED',
            error: 'Relay not initialized'
          };
        }

        const readyState = (relay as { socket?: { readyState?: number } })?.socket?.readyState ?? 3;
        const readyStateText = ['CONNECTING', 'OPEN', 'CLOSING', 'CLOSED'][readyState];
        
        return {
          url,
          connected: readyState === 1, // OPEN
          readyState,
          readyStateText,
          lastSeen: readyState === 1 ? new Date() : undefined,
          // TODO: Add actual read/write counts when available
          readCount: 0,
          writeCount: 0
        };
      });

      setRelayStatuses(statuses);
    };

    // Initial update
    updateStatuses();

    // Update every 5 seconds
    const interval = setInterval(updateStatuses, 5000);

    return () => clearInterval(interval);
  }, [nostr, config.relayUrls]);

  return { relayStatuses };
}