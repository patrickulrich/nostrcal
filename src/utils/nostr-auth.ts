import { NostrSigner } from '@nostrify/nostrify';

/**
 * Creates a NIP-42 authentication event for relay authentication
 * @param challenge - Challenge string from relay
 * @param relayUrl - URL of the relay being authenticated to
 * @param signer - User's signer for creating the event
 * @returns Promise<NostrEvent> - Signed authentication event
 */
export async function createAuthEvent(
  challenge: string,
  relayUrl: string,
  signer: NostrSigner
) {
  const authEvent = {
    kind: 22242,
    created_at: Math.floor(Date.now() / 1000),
    tags: [
      ['relay', relayUrl],
      ['challenge', challenge]
    ],
    content: '',
  };

  return await signer.signEvent(authEvent);
}

/**
 * Normalizes relay URL for authentication
 * @param url - Raw relay URL
 * @returns Normalized URL
 */
export function normalizeRelayUrl(url: string): string {
  try {
    const parsed = new URL(url);
    // Remove trailing slash and normalize
    return parsed.origin + parsed.pathname.replace(/\/$/, '');
  } catch {
    return url;
  }
}

/**
 * Checks if a relay URL looks like it might require authentication
 * @param url - Relay URL to check
 * @returns boolean indicating if auth might be required
 */
export function mightRequireAuth(url: string): boolean {
  // Common patterns that suggest authentication might be required
  const authPatterns = [
    /paid/i,
    /premium/i,
    /private/i,
    /auth/i,
    /member/i,
    /vip/i,
    /pro/i
  ];
  
  return authPatterns.some(pattern => pattern.test(url));
}

/**
 * Known AUTH-enabled relays for NIP-59 gift wrap privacy
 * These relays are known to implement NIP-42 AUTH and only serve
 * kind 1059 events to authenticated recipients
 */
export const AUTH_ENABLED_RELAYS = [
  'wss://relay.nostrcal.com',
  'wss://auth.nostr1.com',
  'wss://inbox.nostr.wine',
  'wss://nostr.land',
  'wss://relay.nostrdice.com',
  'wss://private.red.gb.net',
  'wss://nostr.wine',
  'wss://filter.nostr.wine',
  'wss://relay.orangepill.dev',
  'wss://relay.nostrati.com'
];

/**
 * Check if a relay is known to support AUTH for kind 1059 privacy
 * @param url - Relay URL to check
 * @returns boolean indicating if relay supports AUTH
 */
export function isAuthEnabledRelay(url: string): boolean {
  const normalizedUrl = normalizeRelayUrl(url).toLowerCase();
  return AUTH_ENABLED_RELAYS.some(authRelay => 
    normalizedUrl === authRelay.toLowerCase() ||
    normalizedUrl.includes('auth') ||
    normalizedUrl.includes('private') ||
    normalizedUrl.includes('inbox') ||
    normalizedUrl.includes('nsec')
  );
}