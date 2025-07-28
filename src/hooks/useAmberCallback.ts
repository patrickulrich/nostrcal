import { useEffect } from 'react';
import { isAmberCallback, parseAmberCallback, cleanAmberCallbackUrl } from '@/utils/amber-nip55';

/**
 * Hook to handle Amber callback URL parameters on app initialization
 */
export function useAmberCallback(onCallback?: (result: any) => void) {
  useEffect(() => {
    // Check if current page load is from an Amber callback
    if (isAmberCallback()) {
      console.log('[Amber Callback] Detected Amber callback in URL');
      
      const result = parseAmberCallback();
      if (result) {
        console.log('[Amber Callback] Parsed result:', {
          hasResult: !!result.result,
          hasError: !!result.error,
          package: result.package
        });
        
        // Clean the URL to remove callback parameters
        cleanAmberCallbackUrl();
        
        // Notify parent component if callback provided
        if (onCallback) {
          onCallback(result);
        }
      }
    }
  }, [onCallback]); 
}