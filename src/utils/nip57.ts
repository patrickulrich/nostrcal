import { NostrEvent } from '@nostrify/nostrify';

/**
 * NIP-57 Lightning Zaps utilities for NostrCal
 */

export interface ZapRequest {
  id: string;
  pubkey: string;
  created_at: number;
  kind: 9734;
  tags: string[][];
  content: string;
  sig: string;
}

export interface ZapReceipt {
  id: string;
  pubkey: string;
  created_at: number;
  kind: 9735;
  tags: string[][];
  content: string;
  sig: string;
}

export interface ParsedZapReceipt {
  receipt: ZapReceipt;
  zapRequest: ZapRequest;
  amount: number; // millisats
  recipient: string; // pubkey
  sender?: string; // pubkey (from P tag)
  eventId?: string; // e tag
  eventCoordinate?: string; // a tag
  bolt11: string;
  preimage?: string;
  isValid: boolean;
}

/**
 * Parse a zap receipt and extract relevant information
 */
export function parseZapReceipt(receipt: NostrEvent): ParsedZapReceipt | null {
  if (receipt.kind !== 9735) {
    return null;
  }

  const zapReceipt = receipt as ZapReceipt;
  
  // Extract tags from the zap receipt
  const pTag = zapReceipt.tags.find(tag => tag[0] === 'p')?.[1]; // recipient
  const PTag = zapReceipt.tags.find(tag => tag[0] === 'P')?.[1]; // sender
  const eTag = zapReceipt.tags.find(tag => tag[0] === 'e')?.[1]; // event id
  const aTag = zapReceipt.tags.find(tag => tag[0] === 'a')?.[1]; // event coordinate
  const bolt11Tag = zapReceipt.tags.find(tag => tag[0] === 'bolt11')?.[1];
  const descriptionTag = zapReceipt.tags.find(tag => tag[0] === 'description')?.[1];
  const preimageTag = zapReceipt.tags.find(tag => tag[0] === 'preimage')?.[1];

  if (!pTag || !bolt11Tag || !descriptionTag) {
    return null;
  }

  // Parse the zap request from description
  let zapRequest: ZapRequest;
  try {
    zapRequest = JSON.parse(descriptionTag) as ZapRequest;
  } catch (error) {
    console.error('Failed to parse zap request from description:', error);
    return null;
  }

  // Extract amount from bolt11 invoice
  const amount = extractAmountFromBolt11(bolt11Tag);

  // Extract event coordinate and event id from zap request if not in receipt
  // The 'a' and 'e' tags should be in the embedded zap request, not necessarily the receipt
  let eventCoordinate = aTag;
  let eventId = eTag;
  
  if (!eventCoordinate && zapRequest.tags) {
    const zapRequestATag = zapRequest.tags.find(tag => tag[0] === 'a')?.[1];
    if (zapRequestATag) {
      eventCoordinate = zapRequestATag;
    }
  }
  
  if (!eventId && zapRequest.tags) {
    const zapRequestETag = zapRequest.tags.find(tag => tag[0] === 'e')?.[1];
    if (zapRequestETag) {
      eventId = zapRequestETag;
    }
  }

  return {
    receipt: zapReceipt,
    zapRequest,
    amount,
    recipient: pTag,
    sender: PTag || zapRequest.pubkey, // Try P tag first, fallback to zap request pubkey
    eventId: eventId,
    eventCoordinate: eventCoordinate,
    bolt11: bolt11Tag,
    preimage: preimageTag,
    isValid: validateZapReceipt(zapReceipt, zapRequest)
  };
}

/**
 * Extract amount in millisats from a bolt11 invoice
 */
export function extractAmountFromBolt11(bolt11: string): number {
  try {
    // Lightning Network bolt11 format: ln + network + amount + multiplier + checksum
    // Example: lnbc1u1p5ggeup... means 1 micro-bitcoin
    const match = bolt11.match(/^ln(bc|tb|bcrt)(\d+)([munp]?)1/);
    if (match) {
      const amount = parseInt(match[2]);
      const multiplier = match[3];
      
      switch (multiplier) {
        case 'm': return amount * 100_000; // milli-bitcoin to millisats (1 mBTC = 100,000 msat)
        case 'u': return amount * 100_000; // micro-bitcoin to millisats (1 μBTC = 100,000 msat)
        case 'n': return amount * 100; // nano-bitcoin to millisats (1 nBTC = 100 msat)
        case 'p': return amount * 0.1; // pico-bitcoin to millisats (1 pBTC = 0.1 msat)
        default: return amount * 100_000_000; // bitcoin to millisats (1 BTC = 100,000,000 msat)
      }
    }
    
    // Alternative parsing for different bolt11 formats without the '1' after multiplier
    const amountMatch = bolt11.match(/^ln(bc|tb|bcrt)(\d+)([munp])/);
    if (amountMatch) {
      const amount = parseInt(amountMatch[2]);
      const multiplier = amountMatch[3];
      
      switch (multiplier) {
        case 'm': return amount * 100_000; // milli-bitcoin to millisats
        case 'u': return amount * 100_000; // micro-bitcoin to millisats
        case 'n': return amount * 100; // nano-bitcoin to millisats
        case 'p': return amount * 0.1; // pico-bitcoin to millisats
        default: return amount * 100_000_000; // bitcoin to millisats
      }
    }
  } catch (error) {
    console.error('Failed to extract amount from bolt11:', error);
  }
  return 0;
}

/**
 * Validate a zap receipt according to NIP-57
 */
export function validateZapReceipt(receipt: ZapReceipt, zapRequest: ZapRequest): boolean {
  try {
    // Basic validation
    if (receipt.kind !== 9735 || zapRequest.kind !== 9734) {
      return false;
    }

    // Check that recipient matches
    const receiptP = receipt.tags.find(tag => tag[0] === 'p')?.[1];
    const requestP = zapRequest.tags.find(tag => tag[0] === 'p')?.[1];
    if (receiptP !== requestP) {
      return false;
    }

    // Check that event id matches (if present)
    const receiptE = receipt.tags.find(tag => tag[0] === 'e')?.[1];
    const requestE = zapRequest.tags.find(tag => tag[0] === 'e')?.[1];
    if (requestE && receiptE !== requestE) {
      return false;
    }

    // Check that event coordinate matches (if present)  
    const receiptA = receipt.tags.find(tag => tag[0] === 'a')?.[1];
    const requestA = zapRequest.tags.find(tag => tag[0] === 'a')?.[1];
    // Allow validation to pass if the 'a' tag is in the zap request (which is the expected location)
    if (requestA && receiptA && receiptA !== requestA) {
      return false;
    }

    // Check amount matches (if present in request)
    const requestAmount = zapRequest.tags.find(tag => tag[0] === 'amount')?.[1];
    if (requestAmount) {
      const bolt11Tag = receipt.tags.find(tag => tag[0] === 'bolt11')?.[1];
      if (bolt11Tag) {
        const invoiceAmount = extractAmountFromBolt11(bolt11Tag);
        if (invoiceAmount !== parseInt(requestAmount)) {
          return false;
        }
      }
    }

    return true;
  } catch (error) {
    console.error('Error validating zap receipt:', error);
    return false;
  }
}

/**
 * Check if a zap receipt is for a specific availability template
 */
export function isZapForAvailabilityTemplate(
  zapReceipt: ParsedZapReceipt, 
  templateCoordinate: string,
  requiredAmount: number // in sats
): boolean {
  return (
    zapReceipt.isValid &&
    zapReceipt.eventCoordinate === templateCoordinate &&
    zapReceipt.amount >= requiredAmount * 1000 // convert sats to millisats
  );
}

/**
 * Create a zap request event (kind 9734)
 */
export async function createZapRequest({
  recipient,
  amount, // in millisats
  comment = '',
  eventId,
  eventCoordinate,
  relays = [],
  lnurl,
  senderPubkey
}: {
  recipient: string;
  amount: number;
  comment?: string;
  eventId?: string;
  eventCoordinate?: string;
  relays?: string[];
  lnurl?: string;
  senderPubkey?: string;
}): Promise<Partial<ZapRequest>> {
  const tags: string[][] = [
    ['p', recipient]
  ];

  if (relays.length > 0) {
    tags.push(['relays', ...relays]);
  }

  if (amount > 0) {
    tags.push(['amount', amount.toString()]);
  }

  if (lnurl) {
    tags.push(['lnurl', lnurl]);
  }

  if (eventId) {
    tags.push(['e', eventId]);
  }

  if (eventCoordinate) {
    tags.push(['a', eventCoordinate]);
  }

  // Add sender pubkey as P tag (capital P) - required by NIP-57
  if (senderPubkey) {
    tags.push(['P', senderPubkey]);
  }

  return {
    kind: 9734,
    content: comment,
    tags,
    created_at: Math.floor(Date.now() / 1000)
  };
}

/**
 * Extract LNURL from a user's profile metadata
 */
export function extractLnurlFromProfile(metadata: any): string | null {
  if (!metadata) return null;
  
  // Check for LUD-16 (lightning address)
  if (metadata.lud16) {
    return metadata.lud16;
  }
  
  // Check for LUD-06 (lnurl)
  if (metadata.lud06) {
    return metadata.lud06;
  }
  
  return null;
}

/**
 * Convert Lightning Address (LUD-16) to LNURL
 */
export function lightningAddressToLnurl(address: string): string {
  const [username, domain] = address.split('@');
  return `https://${domain}/.well-known/lnurlp/${username}`;
}

/**
 * Decode LNURL (LUD-06) to URL
 */
export function decodeLnurl(lnurl: string): string {
  // Remove lnurl prefix if present
  const cleanLnurl = lnurl.replace(/^lnurl/, '');
  
  // Decode bech32
  try {
    // Simple base32 decode (in production, use proper bech32 library)
    const decoded = atob(cleanLnurl);
    return decoded;
  } catch {
    // If it's already a URL, return as is
    return lnurl;
  }
}

/**
 * Fetch LNURL callback information
 */
export async function fetchLnurlCallback(lnurlOrAddress: string): Promise<{
  callback: string;
  maxSendable: number;
  minSendable: number;
  metadata: string;
  tag: string;
  allowsNostr?: boolean;
  nostrPubkey?: string;
} | null> {
  try {
    let url: string;
    
    // Handle Lightning Address (LUD-16)
    if (lnurlOrAddress.includes('@')) {
      url = lightningAddressToLnurl(lnurlOrAddress);
    }
    // Handle LNURL (LUD-06)
    else if (lnurlOrAddress.startsWith('lnurl')) {
      url = decodeLnurl(lnurlOrAddress);
    }
    // Already a URL
    else {
      url = lnurlOrAddress;
    }

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    
    // Validate required fields
    if (data.tag !== 'payRequest') {
      throw new Error('Invalid LNURL response: not a payRequest');
    }

    return {
      callback: data.callback,
      maxSendable: data.maxSendable || 11000000000, // 110k sats default
      minSendable: data.minSendable || 1000, // 1 sat default
      metadata: data.metadata || '[["text/plain","Lightning payment"]]',
      tag: data.tag,
      allowsNostr: data.allowsNostr,
      nostrPubkey: data.nostrPubkey
    };
  } catch (error) {
    console.error('Failed to fetch LNURL callback:', error);
    return null;
  }
}

/**
 * Request Lightning invoice from LNURL callback
 */
export async function requestLightningInvoice({
  callback,
  amount, // in millisats
  zapRequest, // signed zap request event
  comment = ''
}: {
  callback: string;
  amount: number;
  zapRequest?: any;
  comment?: string;
}): Promise<{
  pr: string; // bolt11 invoice
  successAction?: any;
  routes?: any[];
} | null> {
  try {
    const params = new URLSearchParams({
      amount: amount.toString(),
    });

    if (comment) {
      params.append('comment', comment);
    }

    // Add Nostr zap request if provided
    if (zapRequest) {
      params.append('nostr', JSON.stringify(zapRequest));
    }

    const response = await fetch(`${callback}?${params.toString()}`);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    
    if (data.status === 'ERROR') {
      throw new Error(data.reason || 'LNURL callback error');
    }

    if (!data.pr) {
      throw new Error('No invoice returned from LNURL callback');
    }

    return {
      pr: data.pr,
      successAction: data.successAction,
      routes: data.routes
    };
  } catch (error) {
    console.error('Failed to request Lightning invoice:', error);
    return null;
  }
}