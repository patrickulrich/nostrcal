/**
 * Utility functions for calendar events
 */

import { nip19 } from 'nostr-tools';
import { CalendarEvent } from '@/contexts/EventsContextTypes';

/**
 * Generate naddr URL for a calendar event
 * @param event - Calendar event with d-tag and pubkey
 * @returns naddr URL string or null if encoding fails
 */
export function generateEventNaddr(event: CalendarEvent): string | null {
  if (!event.dTag || !event.pubkey) return null;
  
  try {
    const naddr = nip19.naddrEncode({
      identifier: event.dTag,
      pubkey: event.pubkey,
      kind: event.kind,
    });
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