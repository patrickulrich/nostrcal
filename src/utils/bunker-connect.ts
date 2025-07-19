import { NLogin } from '@nostrify/react/login';
import { NPool } from '@nostrify/nostrify';

interface BunkerConnectionParams {
  pubkey: string;
  relay: string;
  secret?: string;
}

export function parseBunkerUri(uri: string): BunkerConnectionParams {
  try {
    const url = new URL(uri);
    
    if (url.protocol !== 'bunker:') {
      throw new Error('Invalid bunker URI protocol');
    }
    
    const pubkey = url.hostname;
    const relay = url.searchParams.get('relay');
    const secret = url.searchParams.get('secret');
    
    if (!pubkey || !/^[a-fA-F0-9]{64}$/.test(pubkey)) {
      throw new Error('Invalid pubkey in bunker URI');
    }
    
    if (!relay || !relay.startsWith('wss://')) {
      throw new Error('Invalid or missing relay in bunker URI');
    }
    
    return { pubkey, relay, secret: secret || undefined };
  } catch (error) {
    console.error('Failed to parse bunker URI:', error);
    throw new Error('Invalid bunker URI format');
  }
}

export async function createBunkerLogin(uri: string, nostr: NPool): Promise<unknown> {
  const { pubkey, relay, secret: _secret } = parseBunkerUri(uri);
  
  console.log('[Bunker] Parsed URI components:', {
    pubkey: pubkey.substring(0, 8) + '...',
    relay,
    hasSecret: !!_secret,
    secretLength: _secret?.length
  });
  
  // Try the standard library approach first
  try {
    console.log('[Bunker] Attempting standard NLogin.fromBunker...');
    const login = await NLogin.fromBunker(uri, nostr);
    console.log('[Bunker] Standard approach succeeded');
    return login;
  } catch (error) {
    console.warn('[Bunker] Standard approach failed:', error);
    
    // If the standard approach fails, we might need to implement 
    // a custom connection following NIP-46 more closely
    throw new Error(`Bunker connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Fallback function to manually implement NIP-46 connection
export async function manualBunkerConnect(
  _pubkey: string,
  _relay: string,
  _secret?: string
): Promise<unknown> {
  console.log('[Bunker] Attempting manual NIP-46 connection...');
  
  // This would require implementing the full NIP-46 handshake
  // which is quite complex. For now, we'll rely on the library.
  throw new Error('Manual bunker connection not implemented yet');
}