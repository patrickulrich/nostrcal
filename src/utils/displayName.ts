import { NostrMetadata } from '@nostrify/nostrify';
import { genUserName } from '@/lib/genUserName';

/**
 * Get display name for a user with proper fallback handling
 */
export function getDisplayName(pubkey: string, metadata?: NostrMetadata): string {
  // First priority: metadata name
  if (metadata?.name && metadata.name.trim()) {
    return metadata.name.trim();
  }
  
  // Second priority: metadata display_name
  if (metadata?.display_name && metadata.display_name.trim()) {
    return metadata.display_name.trim();
  }
  
  
  // Last resort: generated name
  return genUserName(pubkey);
}

/**
 * Get display name with loading state indication
 */
export function getDisplayNameWithLoadingState(
  pubkey: string, 
  metadata?: NostrMetadata, 
  isLoading?: boolean,
  hasError?: boolean
): string {
  if (isLoading) {
    return genUserName(pubkey); // Use generated name while loading
  }
  
  if (hasError) {
    return genUserName(pubkey); // Use generated name if error occurred
  }
  
  return getDisplayName(pubkey, metadata);
}

/**
 * Debug function to check why a display name is being generated
 */
export function debugDisplayName(pubkey: string, metadata?: NostrMetadata): string {
  const reasons: string[] = [];
  
  if (!metadata) {
    reasons.push('No metadata loaded');
  } else {
    if (!metadata.name) reasons.push('No name field');
    if (!metadata.display_name) reasons.push('No display_name field');
  }
  
  if (reasons.length > 0) {
    console.warn(`Using generated name for ${pubkey.slice(0, 8)}... because: ${reasons.join(', ')}`);
  }
  
  return getDisplayName(pubkey, metadata);
}