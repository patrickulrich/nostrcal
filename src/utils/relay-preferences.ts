import { NostrEvent } from '@nostrify/nostrify';
import { relayCache } from '@/utils/relay-cache';

/**
 * Relay Preferences utilities for NIP-52 (private events) and NIP-65 (general relay lists)
 */

export interface RelayPreference {
  url: string;
  read?: boolean;
  write?: boolean;
}

/**
 * Parse kind 10050 relay preferences (NIP-52 private events)
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
 * Parse kind 10002 relay list metadata (NIP-65 general relays)
 */
export function parseRelayListMetadata(event: NostrEvent): RelayPreference[] {
  if (event.kind !== 10002) {
    throw new Error('Event is not a relay list metadata event (kind 10002)');
  }
  
  return event.tags
    .filter(tag => tag[0] === 'r' && tag[1])
    .map(tag => ({
      url: tag[1],
      read: tag[2] !== 'write',   // read unless explicitly write-only
      write: tag[2] !== 'read'    // write unless explicitly read-only
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
 * Get default relay preferences for private calendar events (NIP-52)
 */
export function getDefaultRelayPreferences(): RelayPreference[] {
  return [
    { url: 'wss://relay.nostrcal.com', read: true, write: true },
    { url: 'wss://auth.nostr1.com', read: true, write: true },
    { url: 'wss://relay.nostr.band', read: true, write: true }
  ];
}

/**
 * Get default general relays when author hasn't published kind 10002 (NIP-65)
 */
export function getDefaultGeneralRelays(): RelayPreference[] {
  return [
    { url: 'wss://relay.damus.io', read: true, write: true },
    { url: 'wss://nos.lol', read: true, write: true },
    { url: 'wss://relay.primal.net', read: true, write: true }
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
 * Query a participant's relay preferences (NIP-52 private events)
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
 * Query an author's relay list metadata (NIP-65 general relays) with caching
 * Returns their published relay list or defaults if not found
 */
export async function getAuthorRelayListMetadata(
  pubkey: string,
  nostr: { query: (filters: unknown[], options?: unknown) => Promise<NostrEvent[]> }
): Promise<RelayPreference[]> {
  // Check cache first
  const cached = relayCache.get(pubkey);
  if (cached) {
    return cached;
  }

  try {
    const signal = AbortSignal.timeout(5000);
    const events = await nostr.query([
      {
        kinds: [10002],
        authors: [pubkey],
        limit: 1
      }
    ], { signal });

    if (events.length > 0) {
      const relayList = parseRelayListMetadata(events[0]);
      const result = relayList.length > 0 ? relayList : getDefaultGeneralRelays();
      
      // Cache the result (ensure read/write are boolean, not undefined)
      const resultWithBooleans = result.map(r => ({
        url: r.url,
        read: r.read !== false,
        write: r.write !== false
      }));
      relayCache.set(pubkey, resultWithBooleans);
      return result;
    }
  } catch (error) {
    console.warn(`Failed to fetch relay list metadata for ${pubkey}:`, error);
  }

  // Return defaults if no relay list found or query failed
  const defaults = getDefaultGeneralRelays();
  const defaultsWithBooleans = defaults.map(r => ({
    url: r.url,
    read: r.read !== false,
    write: r.write !== false
  }));
  relayCache.set(pubkey, defaultsWithBooleans);
  return defaults;
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