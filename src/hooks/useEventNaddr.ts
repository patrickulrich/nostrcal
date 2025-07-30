import { useNostr } from '@nostrify/react';
import { CalendarEvent } from '@/contexts/EventsContextTypes';
import { generateEventNaddrWithRelayHints } from '@/utils/event-utils';

/**
 * Hook to generate naddr with relay hints for calendar events
 */
export function useEventNaddr() {
  const { nostr } = useNostr();

  /**
   * Generate naddr URL for a calendar event with automatic NIP-65 relay hints
   * @param event - Calendar event with d-tag and pubkey
   * @returns Promise<string | null> - naddr URL string or null if encoding fails
   */
  const generateNaddrWithHints = async (event: CalendarEvent): Promise<string | null> => {
    if (!nostr) {
      console.warn('Nostr client not available for naddr generation');
      return null;
    }

    return generateEventNaddrWithRelayHints(event, nostr);
  };

  return {
    generateNaddrWithHints,
  };
}