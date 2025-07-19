import { nip44, getPublicKey } from 'nostr-tools';

/**
 * NIP-44 encryption utilities for private calendar events
 */

/**
 * Get conversation key for NIP-44 encryption
 */
export function getConversationKey(privateKeyHex: string, publicKeyHex: string): Uint8Array {
  const privateKeyBytes = hexToBytes(privateKeyHex);
  return nip44.v2.utils.getConversationKey(privateKeyBytes, publicKeyHex);
}

/**
 * Encrypt data using NIP-44 v2
 */
export function encrypt(data: unknown, privateKeyHex: string, publicKeyHex: string): string {
  const conversationKey = getConversationKey(privateKeyHex, publicKeyHex);
  return nip44.v2.encrypt(JSON.stringify(data), conversationKey);
}

/**
 * Decrypt data using NIP-44 v2
 */
export function decrypt(encryptedData: string, privateKeyHex: string, publicKeyHex: string): unknown {
  const conversationKey = getConversationKey(privateKeyHex, publicKeyHex);
  const decryptedJson = nip44.v2.decrypt(encryptedData, conversationKey);
  return JSON.parse(decryptedJson);
}

/**
 * Get public key from private key
 */
export function getPublicKeyFromPrivate(privateKeyHex: string): string {
  return getPublicKey(hexToBytes(privateKeyHex));
}

/**
 * Convert hex string to bytes
 */
export function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
  }
  return bytes;
}

/**
 * Convert bytes to hex string
 */
export function toHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}