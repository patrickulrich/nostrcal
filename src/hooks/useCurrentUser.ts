import { useState, useEffect, useMemo } from 'react';
import { useAuthor } from './useAuthor.ts';
import { NostrSigner } from '@nostrify/nostrify';

// Adapter to convert window.nostr to NostrSigner interface
function createSignerAdapter(windowNostr: NonNullable<typeof window.nostr>): NostrSigner {
  return {
    getPublicKey: () => windowNostr.getPublicKey(),
    signEvent: (event) => windowNostr.signEvent(event),
    nip44: windowNostr.nip44 ? {
      encrypt: (pubkey, plaintext) => windowNostr.nip44!.encrypt(pubkey, plaintext),
      decrypt: (pubkey, ciphertext) => windowNostr.nip44!.decrypt(pubkey, ciphertext),
    } : undefined,
    nip04: windowNostr.nip04 ? {
      encrypt: (pubkey, plaintext) => windowNostr.nip04!.encrypt(pubkey, plaintext),
      decrypt: (pubkey, ciphertext) => windowNostr.nip04!.decrypt(pubkey, ciphertext),
    } : undefined,
  };
}

interface SimpleUser {
  pubkey: string;
  signer: NostrSigner;
  metadata?: any;
}

// Global auth state to share between hook instances
let globalPubkey: string | undefined = undefined;
let globalIsLoading = true;
const subscribers: Set<(pubkey: string | undefined, isLoading: boolean) => void> = new Set();
let isGlobalAuthSetup = false;

function notifySubscribers() {
  subscribers.forEach(callback => callback(globalPubkey, globalIsLoading));
}

function setupGlobalAuth() {
  if (isGlobalAuthSetup) return;
  isGlobalAuthSetup = true;
  
  let isProcessingAuth = false;
  let lastAuthTimestamp = 0;
  
  const checkLogin = async () => {
    if (isProcessingAuth) return;
    isProcessingAuth = true;
    
    try {
      if (window.nostr) {
        const pk = await window.nostr.getPublicKey();
        globalPubkey = pk;
      } else {
        globalPubkey = undefined;
      }
    } catch {
      globalPubkey = undefined;
    } finally {
      globalIsLoading = false;
      isProcessingAuth = false;
      notifySubscribers();
    }
  };

  const handleAuth = (e: CustomEvent) => {
    // Debounce rapid auth events
    const now = Date.now();
    if (now - lastAuthTimestamp < 100) return;
    lastAuthTimestamp = now;
    
    if (e.detail.type === 'logout') {
      globalPubkey = undefined;
      globalIsLoading = false;
      notifySubscribers();
    } else if (e.detail.type === 'login' || e.detail.type === 'signup') {
      checkLogin();
    }
  };

  // Don't check initial auth state to avoid interfering with bunker flows
  globalIsLoading = false;
  notifySubscribers();

  // Listen for auth changes
  document.addEventListener('nlAuth', handleAuth as EventListener);
}

export function useCurrentUser() {
  const [pubkey, setPubkey] = useState<string | undefined>(globalPubkey);
  const [isLoading, setIsLoading] = useState(globalIsLoading);
  
  useEffect(() => {
    // Setup global auth handling once
    setupGlobalAuth();
    
    // Subscribe to global auth changes
    const handleAuthChange = (newPubkey: string | undefined, newIsLoading: boolean) => {
      setPubkey(newPubkey);
      setIsLoading(newIsLoading);
    };
    
    subscribers.add(handleAuthChange);
    
    // Set initial state
    handleAuthChange(globalPubkey, globalIsLoading);
    
    return () => {
      subscribers.delete(handleAuthChange);
    };
  }, []);

  const author = useAuthor(pubkey);
  
  // Memoize the signer to prevent excessive re-creation
  const signer = useMemo(() => {
    return window.nostr ? createSignerAdapter(window.nostr) : null;
  }, [pubkey]); // Recreate when pubkey changes (indicates new auth)
  
  const user: SimpleUser | undefined = pubkey && signer ? {
    pubkey,
    signer,
    metadata: author.data?.metadata
  } : undefined;


  return {
    user,
    users: user ? [user] : [],
    ...author.data,
    isLoading: isLoading || author.isLoading,
  };
}
