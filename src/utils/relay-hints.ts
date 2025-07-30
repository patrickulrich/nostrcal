/**
 * Extract relay hints from event tags
 */

import { NostrEvent } from '@nostrify/nostrify';

/**
 * Extract relay hints from participant tags in an event
 * Per NIP-10, p tags can have relay hints in the third position
 */
export function extractRelayHintsFromEvent(event: NostrEvent): Map<string, string[]> {
  const relayHints = new Map<string, string[]>();
  
  // Extract relay hints from p tags
  for (const tag of event.tags) {
    if (tag[0] === 'p' && tag[1] && tag[2]) {
      const pubkey = tag[1];
      const relayHint = tag[2];
      
      if (!relayHints.has(pubkey)) {
        relayHints.set(pubkey, []);
      }
      
      const hints = relayHints.get(pubkey)!;
      if (!hints.includes(relayHint)) {
        hints.push(relayHint);
      }
    }
  }
  
  return relayHints;
}

/**
 * Extract relay hints for a specific pubkey from an event's tags
 */
export function getRelayHintsForPubkey(event: NostrEvent, pubkey: string): string[] {
  const hints: string[] = [];
  
  for (const tag of event.tags) {
    if (tag[0] === 'p' && tag[1] === pubkey && tag[2]) {
      if (!hints.includes(tag[2])) {
        hints.push(tag[2]);
      }
    }
  }
  
  return hints;
}

/**
 * Check if we need to fetch an event based on relay hints
 * Returns relay URLs that should be queried for this event
 */
export function getRelaysForEventDiscovery(
  event: NostrEvent,
  configuredRelays: string[],
  cachedRelayData?: Map<string, Array<{url: string; read: boolean; write: boolean}>>
): string[] {
  const relays = new Set<string>(configuredRelays);
  
  // Add relay hints from p tags
  const relayHints = extractRelayHintsFromEvent(event);
  for (const hints of relayHints.values()) {
    hints.forEach(hint => relays.add(hint));
  }
  
  // Also add cached relay data if available
  if (cachedRelayData) {
    for (const [pubkey] of relayHints) {
      const cached = cachedRelayData.get(pubkey);
      if (cached) {
        cached
          .filter(r => r.read)
          .forEach(r => relays.add(r.url));
      }
    }
  }
  
  return Array.from(relays);
}