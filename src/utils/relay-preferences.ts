import { NostrEvent } from '@nostrify/nostrify';

/**
 * NIP-52 Relay Preferences utilities for private calendar events
 */

export interface RelayPreference {
  url: string;
  read?: boolean;
  write?: boolean;
}

/**
 * Parse kind 10050 relay preferences
 */
export function parseRelayPreferences(event: NostrEvent): RelayPreference[] {
  if (event.kind !== 10050) {
    throw new Error('Event is not a relay preferences event (kind 10050)');
  }
  
  return event.tags
    .filter(tag => tag[0] === 'relay' && tag[1])
    .map(tag => ({
      url: tag[1],
      read: tag[2] !== 'write',
      write: tag[2] !== 'read'
    }));
}

/**
 * Create relay preferences event
 */
export function createRelayPreferencesEvent(relays: RelayPreference[]): Partial<NostrEvent> {
  const tags = relays.map(relay => {
    const tag = ['relay', relay.url];
    
    if (relay.read === false && relay.write === true) {
      tag.push('write');
    } else if (relay.read === true && relay.write === false) {
      tag.push('read');
    }
    // If both read and write are true (or undefined), no third parameter needed
    
    return tag;
  });
  
  return {
    kind: 10050,
    content: '',
    tags,
    created_at: Math.floor(Date.now() / 1000)
  };
}

/**
 * Get default relay preferences for private calendar events
 */
export function getDefaultRelayPreferences(): RelayPreference[] {
  return [
    { url: 'wss://relay.nostrcal.com', read: true, write: true },
    { url: 'wss://auth.nostr1.com', read: true, write: true },
    { url: 'wss://relay.nostr.band', read: true, write: true }
  ];
}

/**
 * Filter relays for writing private events
 */
export function getWriteRelays(preferences: RelayPreference[]): string[] {
  return preferences
    .filter(pref => pref.write !== false)
    .map(pref => pref.url);
}

/**
 * Query a participant's relay preferences
 * Returns their published preferences or defaults if not found
 */
export async function getParticipantRelayPreferences(
  pubkey: string,
  nostr: { query: (filters: unknown[], options?: unknown) => Promise<NostrEvent[]> }
): Promise<RelayPreference[]> {
  try {
    const signal = AbortSignal.timeout(5000);
    const events = await nostr.query([
      {
        kinds: [10050],
        authors: [pubkey],
        limit: 1
      }
    ], { signal });

    if (events.length > 0) {
      const preferences = parseRelayPreferences(events[0]);
      return preferences.length > 0 ? preferences : getDefaultRelayPreferences();
    }
  } catch (error) {
    console.warn(`Failed to fetch relay preferences for ${pubkey}:`, error);
  }

  // Return defaults if no preferences found or query failed
  return getDefaultRelayPreferences();
}

/**
 * Filter relays for reading private events
 */
export function getReadRelays(preferences: RelayPreference[]): string[] {
  return preferences
    .filter(pref => pref.read !== false)
    .map(pref => pref.url);
}

/**
 * Validate relay URL
 */
export function isValidRelayUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'wss:' || parsed.protocol === 'ws:';
  } catch {
    return false;
  }
}

/**
 * Merge relay preferences with defaults
 */
export function mergeWithDefaults(preferences: RelayPreference[]): RelayPreference[] {
  const defaults = getDefaultRelayPreferences();
  const existing = new Set(preferences.map(p => p.url));
  
  const merged = [...preferences];
  
  for (const defaultRelay of defaults) {
    if (!existing.has(defaultRelay.url)) {
      merged.push(defaultRelay);
    }
  }
  
  return merged;
}