import { useAmberCallback } from '@/hooks/useAmberCallback';

/**
 * Component to handle Amber callback URL parameters
 */
export function AmberCallbackHandler() {
  useAmberCallback((result) => {
    // Handle the callback result if needed
    // For now, just log it - the login flow will handle the actual result
    console.log('[AmberCallbackHandler] Received callback result:', result);
  });

  // This component doesn't render anything
  return null;
}