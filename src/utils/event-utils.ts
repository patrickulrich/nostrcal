/**
 * Utility functions for calendar events
 */

import { nip19 } from 'nostr-tools';
import { CalendarEvent } from '@/contexts/EventsContextTypes';

/**
 * Generate naddr URL for a calendar event with relay hints
 * @param event - Calendar event with d-tag and pubkey
 * @param relays - Optional relay hints to include in the naddr
 * @returns naddr URL string or null if encoding fails
 */
export function generateEventNaddr(event: CalendarEvent, relays?: string[]): string | null {
  if (!event.dTag || !event.pubkey) return null;
  
  try {
    const naddrData: {
      identifier: string;
      pubkey: string;
      kind: number;
      relays?: string[];
    } = {
      identifier: event.dTag,
      pubkey: event.pubkey,
      kind: event.kind,
    };
    
    // Add relay hints if provided
    if (relays && relays.length > 0) {
      naddrData.relays = relays;
    }
    
    const naddr = nip19.naddrEncode(naddrData);
    return `/events/${naddr}`;
  } catch (error) {
    console.error('Failed to generate naddr:', error);
    return null;
  }
}

/**
 * Generate calendar event URL - tries naddr first, falls back to ID-based URL
 * @param event - Calendar event
 * @returns URL string for the event
 */
export function getCalendarEventUrl(event: CalendarEvent): string {
  const naddrUrl = generateEventNaddr(event);
  return naddrUrl || `/calendar/${event.id}`;
}