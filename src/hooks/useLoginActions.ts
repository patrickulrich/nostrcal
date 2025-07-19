import { useNostr } from '@nostrify/react';
import { NLogin, useNostrLogin, NLoginType } from '@nostrify/react/login';
import { createBunkerLogin, parseBunkerUri } from '@/utils/bunker-connect';

// NOTE: This file should not be edited except for adding new login methods.

export function useLoginActions() {
  const { nostr } = useNostr();
  const { logins, addLogin, removeLogin } = useNostrLogin();

  return {
    // Login with a Nostr secret key
    nsec(nsec: string): void {
      const login = NLogin.fromNsec(nsec);
      addLogin(login);
    },
    // Login with a NIP-46 "bunker://" URI
    async bunker(uri: string): Promise<void> {
      if (!nostr) {
        throw new Error('Nostr instance not available for bunker connection');
      }
      
      console.log('[Bunker Login] Attempting to connect with URI:', uri.substring(0, 20) + '...');
      
      try {
        // Parse and validate the URI first
        const { pubkey, relay, secret } = parseBunkerUri(uri);
        
        console.log('[Bunker Login] Parsed components:', {
          pubkey: pubkey.substring(0, 8) + '...',
          relay,
          hasSecret: !!secret,
          secretLength: secret?.length
        });
        
        // Use our enhanced bunker connection
        const login = await createBunkerLogin(uri, nostr);
        console.log('[Bunker Login] Successfully created login:', (login as { type?: string }).type);
        addLogin(login as NLoginType);
        console.log('[Bunker Login] Login added successfully');
        
      } catch (error) {
        console.error('[Bunker Login] Failed to create bunker login:', error);
        
        // Provide more specific error messages
        if (error instanceof Error) {
          if (error.message.includes('invalid secret')) {
            throw new Error('Invalid secret. This could mean:\n• The secret has expired\n• The secret was already used\n• There\'s a mismatch between the secret and bunker service\n\nPlease generate a new bunker URI from nsec.app');
          } else if (error.message.includes('timeout')) {
            throw new Error('Connection timeout. Please check that the relay is accessible.');
          } else if (error.message.includes('relay')) {
            throw new Error('Relay connection failed. Please verify the relay URL.');
          } else if (error.message.includes('Invalid bunker URI')) {
            throw new Error('Invalid bunker URI format. Please check the URI is copied correctly.');
          }
        }
        
        throw new Error(error instanceof Error ? error.message : 'Failed to connect to bunker');
      }
    },
    // Login with a NIP-07 browser extension
    async extension(): Promise<void> {
      const login = await NLogin.fromExtension();
      addLogin(login);
    },
    // Log out the current user
    async logout(): Promise<void> {
      const login = logins[0];
      if (login) {
        removeLogin(login.id);
      }
    }
  };
}
