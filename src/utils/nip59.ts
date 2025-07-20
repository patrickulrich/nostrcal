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
  // For extension signers, we might need to use NIP-04 or ask the user for encryption
  try {
    // If signer has nip44 capability, use it
    if (signer.nip44?.encrypt) {
      unsignedSeal.content = await signer.nip44.encrypt(recipientPublicKeyHex, JSON.stringify(rumor));
    } else {
      // Fallback: we can't encrypt without access to private key
      // This would require the user to provide their private key or use a different method
      console.error('❌ Signer does not support NIP-44 encryption');
      throw new Error('Signer does not support NIP-44 encryption');
    }
  } catch (error) {
    // If we can't encrypt, we need to handle this gracefully
    console.error('Failed to encrypt rumor:', error);
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
  
  for (const recipientPubkey of recipientPublicKeys) {
    try {
      const seal = await createSeal(rumor, signer, recipientPubkey);
      const giftWrap = await createGiftWrap(seal, recipientPubkey, signer);
      giftWraps.push(giftWrap);
    } catch (error) {
      console.error(`Failed to create gift wrap for ${recipientPubkey}:`, error);
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

  for (const giftWrap of giftWraps) {
    // Extract recipient pubkey from the gift wrap
    const recipientPubkey = giftWrap.tags.find(t => t[0] === 'p')?.[1];
    if (!recipientPubkey) {
      console.error('Gift wrap missing recipient pubkey');
      failCount++;
      continue;
    }

    try {
      // Get participant's relay preferences
      const participantRelays = await getParticipantRelayPreferences(recipientPubkey, nostr);
      const writeRelays = participantRelays
        .filter(relay => relay.write !== false)
        .map(relay => relay.url);


      // Publish to each of the participant's relays
      const publishPromises = writeRelays.map(async relayUrl => {
        try {
          await nostr.event(giftWrap, { relays: [relayUrl] });
          return true;
        } catch (err) {
          console.warn(`Failed to publish to ${relayUrl}:`, err);
          return false;
        }
      });

      const results = await Promise.allSettled(publishPromises);
      const relaySuccesses = results.filter(r => r.status === 'fulfilled' && r.value !== null).length;
      
      if (relaySuccesses > 0) {
        successCount++;
      } else {
        failCount++;
        console.error(`Failed to publish to any relay for ${recipientPubkey}`);
      }
    } catch (error) {
      console.error(`Error publishing gift wrap for ${recipientPubkey}:`, error);
      failCount++;
    }
  }

  return { successful: successCount, failed: failCount };
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