import { generateSecretKey, getPublicKey, getEventHash, finalizeEvent, UnsignedEvent } from 'nostr-tools';
import { encrypt, decrypt, toHex } from './nip44';
import { NostrEvent, NostrSigner } from '@nostrify/nostrify';

/**
 * NIP-59 Gift Wrap utilities for private calendar events
 */

export type Rumor = Omit<NostrEvent, 'sig'> & { id: string };

const TWO_DAYS = 2 * 24 * 60 * 60;

/**
 * Get current time in seconds
 */
const now = () => Math.round(Date.now() / 1000);

/**
 * Get random time up to 2 days in the past
 */
const randomPastTime = () => Math.round(now() - (Math.random() * TWO_DAYS));

/**
 * Create a rumor (unsigned event with ID)
 */
export async function createRumor(event: Partial<Omit<NostrEvent, 'id' | 'pubkey' | 'sig'>>, signer: NostrSigner): Promise<Rumor> {
  const pubkey = await signer.getPublicKey();
  const rumor = {
    created_at: now(),
    content: "",
    tags: [],
    ...event,
    pubkey,
  };

  const id = getEventHash(rumor as UnsignedEvent);
  (rumor as Rumor).id = id;
  return rumor as Rumor;
}

/**
 * Create a seal (kind 13) that wraps a rumor using a signer
 */
export async function createSeal(
  rumor: Rumor, 
  signer: NostrSigner, 
  recipientPublicKeyHex: string
): Promise<NostrEvent> {
  
  const senderPubkey = await signer.getPublicKey();
  
  // For browser extension signers, we need to work with the signer's capabilities
  // We'll encrypt using the conversation key derived from public keys
  const unsignedSeal = {
    kind: 13,
    content: '', // We'll set this after we figure out encryption
    created_at: randomPastTime(),
    tags: [],
    pubkey: senderPubkey,
  };


  // Try to encrypt the rumor
  
  try {
    // If signer has nip44 capability, use it
    if (signer.nip44?.encrypt) {
      unsignedSeal.content = await signer.nip44.encrypt(recipientPublicKeyHex, JSON.stringify(rumor));
    } else {
      // Fallback: we can't encrypt without access to private key
      console.error('❌ Signer does not support NIP-44 encryption:', {
        signerType: signer.constructor.name,
        availableMethods: Object.keys(signer),
        nip44Available: !!signer.nip44
      });
      throw new Error('Signer does not support NIP-44 encryption');
    }
  } catch (error) {
    // If we can't encrypt, we need to handle this gracefully
    console.error('Failed to encrypt rumor:', {
      error,
      signerType: signer.constructor.name,
      errorMessage: error instanceof Error ? error.message : 'Unknown error'
    });
    throw new Error('Unable to encrypt private event with this signer');
  }

  // Sign the seal
  const signedSeal = await signer.signEvent(unsignedSeal);
  return signedSeal;
}

/**
 * Create a gift wrap (kind 1059) that wraps a seal
 */
export async function createGiftWrap(
  seal: NostrEvent, 
  recipientPublicKeyHex: string,
  _signer?: NostrSigner
): Promise<NostrEvent> {
  const randomPrivateKey = generateSecretKey();
  const randomPrivateKeyHex = toHex(randomPrivateKey);
  const _randomPublicKey = getPublicKey(randomPrivateKey);
  
  // Encrypt the seal using the ephemeral key
  const encryptedContent = encrypt(seal, randomPrivateKeyHex, recipientPublicKeyHex);
  
  // Create and sign the gift wrap with the ephemeral key
  const giftWrapEvent = {
    kind: 1059,
    content: encryptedContent,
    created_at: randomPastTime(),
    tags: [["p", recipientPublicKeyHex]],
  };
  
  const signedGiftWrap = finalizeEvent(giftWrapEvent, randomPrivateKey) as NostrEvent;
  
  return signedGiftWrap;
}

/**
 * Unwrap a gift wrap to get the seal
 */
export function unwrapGiftWrap(
  giftWrap: NostrEvent,
  recipientPrivateKeyHex: string
): NostrEvent {
  if (giftWrap.kind !== 1059) {
    throw new Error('Event is not a gift wrap (kind 1059)');
  }
  
  const seal = decrypt(giftWrap.content, recipientPrivateKeyHex, giftWrap.pubkey) as NostrEvent;
  
  if (seal.kind !== 13) {
    throw new Error('Unwrapped content is not a seal (kind 13)');
  }
  
  return seal as NostrEvent;
}

/**
 * Unseal a seal to get the rumor
 */
export function unseal(
  seal: NostrEvent,
  recipientPrivateKeyHex: string
): Rumor {
  if (seal.kind !== 13) {
    throw new Error('Event is not a seal (kind 13)');
  }
  
  const rumor = decrypt(seal.content, recipientPrivateKeyHex, seal.pubkey);
  
  return rumor as Rumor;
}

/**
 * Complete unwrapping: gift wrap -> seal -> rumor
 */
export function unwrapPrivateEvent(
  giftWrap: NostrEvent,
  recipientPrivateKeyHex: string
): Rumor {
  const seal = unwrapGiftWrap(giftWrap, recipientPrivateKeyHex);
  return unseal(seal, recipientPrivateKeyHex);
}

/**
 * Complete unwrapping using signer capabilities: gift wrap -> seal -> rumor
 */
export async function unwrapPrivateEventWithSigner(
  giftWrap: NostrEvent,
  signer: NostrSigner
): Promise<Rumor> {
  if (giftWrap.kind !== 1059) {
    throw new Error('Event is not a gift wrap (kind 1059)');
  }

  // First unwrap the gift wrap to get the seal
  // The gift wrap is encrypted with an ephemeral key to the recipient
  let seal: NostrEvent;
  
  if (signer.nip44?.decrypt) {
    // Use signer's NIP-44 decrypt capability
    const decryptedContent = await signer.nip44.decrypt(giftWrap.pubkey, giftWrap.content);
    seal = JSON.parse(decryptedContent);
  } else {
    throw new Error('Signer does not support NIP-44 decryption');
  }

  if (seal.kind !== 13) {
    throw new Error('Unwrapped content is not a seal (kind 13)');
  }

  // Now unseal the seal to get the rumor
  // The seal is encrypted from the original sender to the recipient
  let rumor: Rumor;
  
  if (signer.nip44?.decrypt) {
    // Use signer's NIP-44 decrypt capability
    const decryptedContent = await signer.nip44.decrypt(seal.pubkey, seal.content);
    rumor = JSON.parse(decryptedContent);
  } else {
    throw new Error('Signer does not support NIP-44 decryption');
  }

  return rumor as Rumor;
}

/**
 * Create multiple gift wraps for multiple recipients using a signer
 */
export async function createGiftWrapsForRecipients(
  rumor: Rumor,
  signer: NostrSigner,
  recipientPublicKeys: string[]
): Promise<NostrEvent[]> {
  const giftWraps: NostrEvent[] = [];
  
  for (let i = 0; i < recipientPublicKeys.length; i++) {
    const recipientPubkey = recipientPublicKeys[i];
    
    try {
      const seal = await createSeal(rumor, signer, recipientPubkey);
      const giftWrap = await createGiftWrap(seal, recipientPubkey, signer);
      
      giftWraps.push(giftWrap);
    } catch (error) {
      console.error(`❌ [createGiftWrapsForRecipients] Failed to create gift wrap for ${recipientPubkey.substring(0, 8)}:`, {
        error: error instanceof Error ? error.message : 'Unknown error',
        errorType: error instanceof Error ? error.constructor.name : typeof error,
        stack: error instanceof Error ? error.stack?.split('\n').slice(0, 3) : undefined
      });
      // Continue with other recipients
    }
  }
  
  return giftWraps;
}

/**
 * Publish gift wraps to participants' relay preferences
 * Queries each participant's 10050 relay list and sends to their preferred relays
 * Falls back to default relays if participant has no published preferences
 */
export async function publishGiftWrapsToParticipants(
  giftWraps: NostrEvent[],
  nostr: { 
    event: (event: NostrEvent, options?: { relays?: string[] }) => Promise<void>;
    query: (filters: unknown[], options?: unknown) => Promise<NostrEvent[]>;
  },
  getParticipantRelayPreferences: (pubkey: string, nostr: { query: (filters: unknown[], options?: unknown) => Promise<NostrEvent[]> }) => Promise<{ url: string; write?: boolean }[]>
): Promise<{ successful: number; failed: number }> {
  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < giftWraps.length; i++) {
    const giftWrap = giftWraps[i];
    
    // Extract recipient pubkey from the gift wrap
    const recipientPubkey = giftWrap.tags.find(t => t[0] === 'p')?.[1];
    if (!recipientPubkey) {
      console.error(`❌ [publishGiftWrapsToParticipants] Gift wrap ${i + 1} missing recipient pubkey:`, {
        giftWrapId: giftWrap.id.substring(0, 8),
        tags: giftWrap.tags
      });
      failCount++;
      continue;
    }

    try {
      // Get participant's relay preferences
      const participantRelays = await getParticipantRelayPreferences(recipientPubkey, nostr);
      const writeRelays = participantRelays
        .filter(relay => relay.write !== false)
        .map(relay => relay.url);

      if (writeRelays.length === 0) {
        console.warn(`⚠️ [publishGiftWrapsToParticipants] No write relays found for ${recipientPubkey.substring(0, 8)}`);
        failCount++;
        continue;
      }

      // Publish to each of the participant's relays
      const publishPromises = writeRelays.map(async (relayUrl, _relayIndex) => {
        try {
          const startTime = Date.now();
          
          await nostr.event(giftWrap, { relays: [relayUrl] });
          
          const duration = Date.now() - startTime;
          return { success: true, relayUrl, duration };
        } catch (err) {
          console.error(`❌ [publishGiftWrapsToParticipants] Failed to publish to ${relayUrl}:`, {
            error: err instanceof Error ? err.message : 'Unknown error',
            errorType: err instanceof Error ? err.constructor.name : typeof err,
            recipientPubkey: recipientPubkey.substring(0, 8),
            giftWrapId: giftWrap.id.substring(0, 8)
          });
          return { success: false, relayUrl, error: err };
        }
      });

      const results = await Promise.allSettled(publishPromises);
      const successfulPublishes = results.filter(r => 
        r.status === 'fulfilled' && r.value && (r.value as any).success
      );
      
      if (successfulPublishes.length > 0) {
        successCount++;
      } else {
        failCount++;
        console.error(`❌ [publishGiftWrapsToParticipants] Failed to publish to any relay for ${recipientPubkey.substring(0, 8)}`);
      }
    } catch (error) {
      console.error(`❌ [publishGiftWrapsToParticipants] Error publishing gift wrap for ${recipientPubkey.substring(0, 8)}:`, {
        error: error instanceof Error ? error.message : 'Unknown error',
        errorType: error instanceof Error ? error.constructor.name : typeof error,
        stack: error instanceof Error ? error.stack : undefined
      });
      failCount++;
    }
  }

  const finalResults = { successful: successCount, failed: failCount };
  return finalResults;
}

/**
 * Extract participant public keys from calendar event
 */
export function extractParticipants(event: Rumor): string[] {
  const participants = event.tags
    .filter(tag => tag[0] === 'p')
    .map(tag => tag[1])
    .filter((pubkey): pubkey is string => typeof pubkey === 'string');
  
  // Add the event creator as a participant
  participants.push(event.pubkey);
  
  // Remove duplicates
  return [...new Set(participants)];
}

/**
 * Validate that a rumor is a valid calendar event
 */
export function isCalendarRumor(rumor: Rumor): boolean {
  const calendarKinds = [31922, 31923, 31924, 31925, 31926, 31927];
  return calendarKinds.includes(rumor.kind);
}

/**
 * Check if an event is a gift wrap
 */
export function isGiftWrap(event: NostrEvent): boolean {
  return event.kind === 1059;
}

/**
 * Check if an event is a seal
 */
export function isSeal(event: NostrEvent): boolean {
  return event.kind === 13;
}