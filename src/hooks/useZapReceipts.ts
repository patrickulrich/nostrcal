import { useState, useEffect } from 'react';
import { useNostr } from '@nostrify/react';
import { useQuery } from '@tanstack/react-query';
import { parseZapReceipt, ParsedZapReceipt, isZapForAvailabilityTemplate } from '@/utils/nip57';
import { NostrEvent } from '@nostrify/nostrify';

/**
 * Hook to fetch and validate zap receipts for availability templates
 */
export function useZapReceipts(templateCoordinate?: string, _requiredAmount?: number) {
  const { nostr } = useNostr();

  return useQuery({
    queryKey: ['zap-receipts', templateCoordinate],
    queryFn: async () => {
      if (!templateCoordinate) return [];

      // Use the same relay strategy that works in LightningPayment
      const popularZapRelays = [
        'wss://relay.nostr.band',
        'wss://nostr.wine', 
        'wss://relay.snort.social',
        'wss://relay.damus.io',
        'wss://nos.lol',
        'wss://relay.primal.net',
        'wss://relay.nostrcal.com'
      ];

      // Extract recipient pubkey from template coordinate
      const recipientPubkey = templateCoordinate.split(':')[1];

      // Try multiple search strategies like LightningPayment does
      const [templateEvents, recipientZaps] = await Promise.all([
        // Query by template coordinate - use zap-focused relays
        nostr.query([
          {
            kinds: [9735], // zap receipts
            '#a': [templateCoordinate], // referencing the availability template
            limit: 100
          }
        ], { 
          signal: AbortSignal.timeout(10000),
          relays: popularZapRelays
        }),
        
        // Query for zap receipts TO the template recipient
        nostr.query([
          {
            kinds: [9735], // zap receipts
            '#p': [recipientPubkey], // zapped TO this person
            since: Math.floor(Date.now() / 1000) - 3600, // Last hour
            limit: 100
          }
        ], { 
          signal: AbortSignal.timeout(10000),
          relays: popularZapRelays
        })
      ]);

      // Combine and deduplicate events
      const allEventIds = new Set();
      const events = [...templateEvents, ...recipientZaps].filter(event => {
        if (allEventIds.has(event.id)) return false;
        allEventIds.add(event.id);
        return true;
      });

      // Parse and validate zap receipts
      const parsedReceipts: ParsedZapReceipt[] = [];
      for (const event of events) {
        const parsed = parseZapReceipt(event);
        if (parsed && parsed.isValid) {
          parsedReceipts.push(parsed);
        }
      }

      return parsedReceipts;
    },
    enabled: !!templateCoordinate,
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to check if a user has a valid zap receipt for an availability template
 */
export function useZapVerification(
  templateCoordinate?: string, 
  requiredAmount?: number, // in sats
  userPubkey?: string
) {
  const { data: zapReceipts, isLoading } = useZapReceipts(templateCoordinate, requiredAmount);

  const hasValidZap = zapReceipts?.some(receipt => {
    const isValid = receipt.sender === userPubkey &&
      requiredAmount &&
      templateCoordinate &&
      isZapForAvailabilityTemplate(receipt, templateCoordinate, requiredAmount);
    
    
    return isValid;
  }) || false;

  return {
    hasValidZap,
    isLoading,
    zapReceipts: zapReceipts || []
  };
}

/**
 * Hook to track zap receipts in real-time
 */
export function useZapReceiptsStream(templateCoordinate?: string) {
  const { nostr } = useNostr();
  const [zapReceipts, setZapReceipts] = useState<ParsedZapReceipt[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!templateCoordinate || !nostr) {
      setZapReceipts([]);
      return;
    }

    let isMounted = true;
    const controller = new AbortController();

    const startStreaming = async () => {
      try {
        setIsLoading(true);
        const eventIds = new Set<string>();

        const subscription = nostr.req([
          {
            kinds: [9735], // zap receipts
            '#a': [templateCoordinate],
            limit: 50
          }
        ], { signal: controller.signal });

        for await (const msg of subscription) {
          if (!isMounted) break;

          if (msg[0] === 'EVENT') {
            const event = msg[2] as NostrEvent;
            
            if (eventIds.has(event.id)) continue;
            eventIds.add(event.id);

            const parsed = parseZapReceipt(event);
            if (parsed && parsed.isValid) {
              setZapReceipts(prev => {
                // Avoid duplicates and sort by created_at descending
                const existing = prev.find(r => r.receipt.id === parsed.receipt.id);
                if (existing) return prev;
                
                return [...prev, parsed].sort((a, b) => b.receipt.created_at - a.receipt.created_at);
              });
            }
          } else if (msg[0] === 'EOSE') {
            setIsLoading(false);
          }
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          console.error('Zap receipts stream error:', error);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    startStreaming();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [templateCoordinate, nostr]);

  return {
    zapReceipts,
    isLoading
  };
}

/**
 * Hook to get user's zap receipts across all templates (for tracking)
 */
export function useUserZapReceipts(userPubkey?: string) {
  const { nostr } = useNostr();

  return useQuery({
    queryKey: ['user-zap-receipts', userPubkey],
    queryFn: async () => {
      if (!userPubkey) return [];

      // Query for zap receipts where user is the sender (P tag)
      const events = await nostr.query([
        {
          kinds: [9735], // zap receipts
          '#P': [userPubkey], // sender
          limit: 100
        }
      ]);

      const parsedReceipts: ParsedZapReceipt[] = [];
      for (const event of events) {
        const parsed = parseZapReceipt(event);
        if (parsed && parsed.isValid) {
          parsedReceipts.push(parsed);
        }
      }

      return parsedReceipts.sort((a, b) => b.receipt.created_at - a.receipt.created_at);
    },
    enabled: !!userPubkey,
    staleTime: 60 * 1000, // 1 minute
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}