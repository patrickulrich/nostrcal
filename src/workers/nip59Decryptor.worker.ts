import { unwrapPrivateEvent } from '@/utils/nip59';
import { NostrEvent } from '@nostrify/nostrify';

interface DecryptionRequest {
  id: string;
  event: NostrEvent;
  privateKey: string;
}

interface DecryptionResponse {
  id: string;
  success: boolean;
  rumor?: unknown;
  error?: string;
}

// Handle messages from main thread
self.onmessage = async (e: MessageEvent<DecryptionRequest>) => {
  const { id, event, privateKey } = e.data;
  
  try {
    // Perform decryption in worker thread
    const rumor = unwrapPrivateEvent(event, privateKey);
    
    // Send successful response
    self.postMessage({
      id,
      success: true,
      rumor
    } as DecryptionResponse);
  } catch (error) {
    // Send error response
    self.postMessage({
      id,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    } as DecryptionResponse);
  }
};