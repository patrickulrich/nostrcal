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