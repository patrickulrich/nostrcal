/**
 * NIP-55 Android Signer Application utilities for Amber integration
 * https://github.com/nostr-protocol/nips/blob/master/55.md
 */

export interface AmberCallbackResult {
  result?: string;
  package?: string;
  id?: string;
  event?: string;
  error?: string;
}

/**
 * Check if the current device is Android
 */
export function isAndroidDevice(): boolean {
  return /Android/i.test(navigator.userAgent);
}

/**
 * Check if Amber or another NIP-55 signer might be available
 * Note: This is a best-effort check since web apps can't directly query installed apps
 */
export function mightHaveAmberSigner(): boolean {
  return isAndroidDevice();
}

/**
 * Generate a unique callback URL for this session
 */
export function generateCallbackUrl(): string {
  const baseUrl = window.location.origin + window.location.pathname;
  const sessionId = Math.random().toString(36).substring(2, 15);
  return `${baseUrl}?amber_callback=true&session=${sessionId}`;
}

/**
 * Parse Amber callback URL parameters
 */
export function parseAmberCallback(url: string = window.location.href): AmberCallbackResult | null {
  try {
    const urlObj = new URL(url);
    const params = urlObj.searchParams;
    
    // Check if this is an Amber callback
    if (!params.get('amber_callback')) {
      return null;
    }
    
    const result: AmberCallbackResult = {};
    
    // Extract callback parameters
    if (params.get('result')) result.result = params.get('result')!;
    if (params.get('package')) result.package = params.get('package')!;
    if (params.get('id')) result.id = params.get('id')!;
    if (params.get('event')) result.event = params.get('event')!;
    if (params.get('error')) result.error = params.get('error')!;
    
    return result;
  } catch (error) {
    console.error('Failed to parse Amber callback URL:', error);
    return null;
  }
}

/**
 * Clean Amber callback parameters from URL without page reload
 */
export function cleanAmberCallbackUrl(): void {
  if (typeof window === 'undefined') return;
  
  try {
    const url = new URL(window.location.href);
    const params = url.searchParams;
    
    // Remove Amber-related parameters
    params.delete('amber_callback');
    params.delete('session');
    params.delete('result');
    params.delete('package');
    params.delete('id');
    params.delete('event');
    params.delete('error');
    
    // Update URL without reload
    const newUrl = url.pathname + (url.search ? url.search : '');
    window.history.replaceState({}, '', newUrl);
  } catch (error) {
    console.error('Failed to clean Amber callback URL:', error);
  }
}

/**
 * Request public key from Amber signer
 */
export function requestAmberPublicKey(): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!isAndroidDevice()) {
      reject(new Error('Amber signing is only available on Android devices'));
      return;
    }
    
    const callbackUrl = generateCallbackUrl();
    const amberUrl = `nostrsigner:?compressionType=none&returnType=signature&type=get_public_key&callbackUrl=${encodeURIComponent(callbackUrl)}`;
    
    console.log('[Amber] Requesting public key with callback:', callbackUrl);
    
    // Set up callback listener
    const handleCallback = () => {
      const result = parseAmberCallback();
      if (result) {
        cleanAmberCallbackUrl();
        
        if (result.error) {
          reject(new Error(`Amber error: ${result.error}`));
        } else if (result.result) {
          console.log('[Amber] Received public key from package:', result.package);
          resolve(result.result);
        } else {
          reject(new Error('No public key received from Amber'));
        }
        
        // Remove listener
        window.removeEventListener('focus', handleCallback);
      }
    };
    
    // Listen for when user returns to the app
    window.addEventListener('focus', handleCallback);
    
    // Set up timeout (30 seconds)
    const timeout = setTimeout(() => {
      window.removeEventListener('focus', handleCallback);
      reject(new Error('Amber request timed out. Please try again.'));
    }, 30000);
    
    // Clear timeout if we get a result
    const originalResolve = resolve;
    const originalReject = reject;
    
    resolve = (value: string) => {
      clearTimeout(timeout);
      originalResolve(value);
    };
    
    reject = (reason?: any) => {
      clearTimeout(timeout);
      originalReject(reason);
    };
    
    try {
      // Attempt to open Amber
      window.location.href = amberUrl;
    } catch {
      clearTimeout(timeout);
      window.removeEventListener('focus', handleCallback);
      reject(new Error('Failed to open Amber signer. Make sure Amber is installed.'));
    }
  });
}

/**
 * Sign an event using Amber signer
 */
export function signEventWithAmber(eventJson: string, currentUserPubkey?: string): Promise<{ signature: string; event: string }> {
  return new Promise((resolve, reject) => {
    if (!isAndroidDevice()) {
      reject(new Error('Amber signing is only available on Android devices'));
      return;
    }
    
    const callbackUrl = generateCallbackUrl();
    const encodedEvent = encodeURIComponent(eventJson);
    let amberUrl = `nostrsigner:${encodedEvent}?compressionType=none&returnType=signature&type=sign_event&callbackUrl=${encodeURIComponent(callbackUrl)}`;
    
    // Add current user if provided
    if (currentUserPubkey) {
      amberUrl += `&current_user=${currentUserPubkey}`;
    }
    
    console.log('[Amber] Requesting event signature with callback:', callbackUrl);
    
    // Set up callback listener
    const handleCallback = () => {
      const result = parseAmberCallback();
      if (result) {
        cleanAmberCallbackUrl();
        
        if (result.error) {
          reject(new Error(`Amber error: ${result.error}`));
        } else if (result.result && result.event) {
          console.log('[Amber] Received signature from package:', result.package);
          resolve({ 
            signature: result.result, 
            event: result.event 
          });
        } else {
          reject(new Error('No signature received from Amber'));
        }
        
        // Remove listener
        window.removeEventListener('focus', handleCallback);
      }
    };
    
    // Listen for when user returns to the app
    window.addEventListener('focus', handleCallback);
    
    // Set up timeout (30 seconds)
    const timeout = setTimeout(() => {
      window.removeEventListener('focus', handleCallback);
      reject(new Error('Amber signing request timed out. Please try again.'));
    }, 30000);
    
    // Clear timeout if we get a result
    const originalResolve = resolve;
    const originalReject = reject;
    
    resolve = (value: { signature: string; event: string }) => {
      clearTimeout(timeout);
      originalResolve(value);
    };
    
    reject = (reason?: any) => {
      clearTimeout(timeout);
      originalReject(reason);
    };
    
    try {
      // Attempt to open Amber
      window.location.href = amberUrl;
    } catch {
      clearTimeout(timeout);
      window.removeEventListener('focus', handleCallback);
      reject(new Error('Failed to open Amber signer. Make sure Amber is installed.'));
    }
  });
}

/**
 * Check if current page load is from an Amber callback
 */
export function isAmberCallback(): boolean {
  const result = parseAmberCallback();
  return result !== null;
}