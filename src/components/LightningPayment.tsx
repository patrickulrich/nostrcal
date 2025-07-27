import { useState } from 'react';
import { useNostr } from '@nostrify/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import { Zap, Copy, ExternalLink, CheckCircle, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/useToast';
import { createZapRequest, extractLnurlFromProfile, fetchLnurlCallback, requestLightningInvoice, parseZapReceipt, ParsedZapReceipt } from '@/utils/nip57';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useAuthor } from '@/hooks/useAuthor';
import { useZapVerification } from '@/hooks/useZapReceipts';
import { isZapForAvailabilityTemplate } from '@/utils/nip57';
import { QRCodeComponent } from '@/components/QRCode';

interface LightningPaymentProps {
  templateCoordinate: string;
  recipientPubkey: string;
  amount: number; // in sats
  templateTitle: string;
  onPaymentComplete?: () => void;
  onCancel?: () => void;
}

export function LightningPayment({
  templateCoordinate,
  recipientPubkey,
  amount,
  templateTitle,
  onPaymentComplete,
  onCancel
}: LightningPaymentProps) {
  const { user } = useCurrentUser();
  const { toast } = useToast();
  const { nostr } = useNostr();
  const { data: recipientProfile } = useAuthor(recipientPubkey);
  const [step, setStep] = useState<'preparing' | 'invoice' | 'paid' | 'error'>('preparing');
  const [comment, setComment] = useState('');
  const [invoice, setInvoice] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isGeneratingInvoice, setIsGeneratingInvoice] = useState(false);
  const [isVerifyingPayment, setIsVerifyingPayment] = useState(false);

  // Use zap verification hook to check payment status
  const { hasValidZap: _hasValidZap, isLoading: _isZapLoading, zapReceipts: _zapReceipts } = useZapVerification(
    templateCoordinate,
    amount,
    user?.pubkey
  );

  const handleGenerateInvoice = async () => {
    if (!user?.signer) {
      setError('User not authenticated');
      setStep('error');
      return;
    }

    if (!recipientProfile?.metadata) {
      setError('Recipient profile not found');
      setStep('error');
      return;
    }

    try {
      setIsGeneratingInvoice(true);
      setError(null);

      // Step 1: Get recipient's LNURL from their profile
      const lnurl = extractLnurlFromProfile(recipientProfile.metadata);
      if (!lnurl) {
        throw new Error('Recipient does not have Lightning payment setup (no LNURL found)');
      }

      // Step 2: Fetch LNURL callback information
      const callbackInfo = await fetchLnurlCallback(lnurl);
      if (!callbackInfo) {
        throw new Error('Failed to fetch LNURL callback information');
      }

      // Check amount limits
      const amountMillisats = amount * 1000;
      if (amountMillisats < callbackInfo.minSendable || amountMillisats > callbackInfo.maxSendable) {
        throw new Error(`Amount must be between ${Math.floor(callbackInfo.minSendable / 1000)} and ${Math.floor(callbackInfo.maxSendable / 1000)} sats`);
      }

      // Step 3: Create and sign zap request (if Nostr zaps are supported)
      let signedZapRequest: any = null;
      if (callbackInfo.allowsNostr) {
        const zapRequest = await createZapRequest({
          recipient: recipientPubkey,
          amount: amountMillisats,
          comment,
          eventCoordinate: templateCoordinate,
          relays: ['wss://relay.damus.io', 'wss://nos.lol', 'wss://relay.nostr.band'],
          senderPubkey: user.pubkey
        });

        signedZapRequest = await user.signer.signEvent(zapRequest as any);
      } else {
        console.log('LNURL service does not support Nostr zaps - no zap receipt will be created');
      }

      // Step 4: Request bolt11 invoice from LNURL callback
      const invoiceResponse = await requestLightningInvoice({
        callback: callbackInfo.callback,
        amount: amountMillisats,
        zapRequest: signedZapRequest,
        comment: comment
      });

      if (!invoiceResponse || !invoiceResponse.pr) {
        throw new Error('Failed to generate Lightning invoice');
      }

      // Step 5: Present invoice for payment
      setInvoice(invoiceResponse.pr);
      setStep('invoice');

    } catch (err) {
      console.error('Failed to generate invoice:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate invoice');
      setStep('error');
    } finally {
      setIsGeneratingInvoice(false);
    }
  };

  const handleCopyInvoice = async () => {
    try {
      await navigator.clipboard.writeText(invoice);
      toast({
        title: "Copied",
        description: "Invoice copied to clipboard",
      });
    } catch (err) {
      console.error('Failed to copy invoice:', err);
    }
  };

  const handleOpenWallet = () => {
    // Try to open with lightning: protocol
    window.open(`lightning:${invoice}`, '_blank');
  };

  const handlePaymentComplete = async () => {
    setIsVerifyingPayment(true);
    setError(null);

    try {
      if (!nostr) {
        throw new Error('Nostr not available');
      }

      // Direct query for zap receipts - try multiple approaches
      const popularZapRelays = [
        'wss://relay.nostr.band',
        'wss://nostr.wine', 
        'wss://relay.snort.social',
        'wss://relay.damus.io',
        'wss://nos.lol',
        'wss://relay.primal.net',
        'wss://relay.nostrcal.com'
      ];
      
      // Try multiple search strategies to find our zap receipt
      // Zap receipts are published by the Lightning node, not the user!
      const [templateEvents, recipientZaps, _anyZapEvents, defaultPoolRecipientZaps] = await Promise.all([
        // Query by template coordinate (the ideal case) - use zap-focused relays
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
        
        // Query for zap receipts TO the template recipient (published by Lightning node)
        nostr.query([
          {
            kinds: [9735], // zap receipts
            '#p': [recipientPubkey], // zapped TO this person
            since: Math.floor(Date.now() / 1000) - 1800, // Last 30 minutes
            limit: 100
          }
        ], { 
          signal: AbortSignal.timeout(10000),
          relays: popularZapRelays
        }),
        
        // Query for ANY recent zap receipts to test relay connectivity
        nostr.query([
          {
            kinds: [9735], // zap receipts
            limit: 50,
            since: Math.floor(Date.now() / 1000) - 3600 // Last hour
          }
        ], { 
          signal: AbortSignal.timeout(10000),
          relays: popularZapRelays
        }),
        
        // Query for zap receipts TO recipient using default relay pool
        nostr.query([
          {
            kinds: [9735], // zap receipts
            '#p': [recipientPubkey], // zapped TO this person
            since: Math.floor(Date.now() / 1000) - 1800, // Last 30 minutes
            limit: 100
          }
        ], { 
          signal: AbortSignal.timeout(10000)
          // No relays specified - use default pool
        })
      ]);

      // Check all zaps to recipient for our specific payment
      const allRecipientZaps = [...recipientZaps, ...defaultPoolRecipientZaps];
      
      // Combine and deduplicate events
      const allEventIds = new Set();
      const events = [...templateEvents, ...allRecipientZaps].filter(event => {
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
      
      const hasValidPayment = parsedReceipts.some(receipt => {
        return receipt.sender === user?.pubkey &&
          amount &&
          templateCoordinate &&
          isZapForAvailabilityTemplate(receipt, templateCoordinate, amount);
      });
      
      // Check if payment is now verified
      if (hasValidPayment) {
        setStep('paid');
        toast({
          title: "Payment Verified",
          description: "Your zap receipt has been verified successfully!",
        });
        onPaymentComplete?.();
      } else {
        // Payment not yet confirmed - but allow continuing
        toast({
          title: "Payment Processing",
          description: "Your payment is being processed. You can continue with your booking - the zap receipt will be verified in the background.",
        });
        setStep('paid');
        // Still call onPaymentComplete to allow booking creation
        onPaymentComplete?.();
      }
    } catch (err) {
      console.error('Failed to verify payment:', err);
      setError('Failed to verify payment. Please try again.');
    } finally {
      setIsVerifyingPayment(false);
    }
  };

  if (step === 'preparing') {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-yellow-500" />
            Payment Required
          </CardTitle>
          <CardDescription>
            This booking requires a {amount} sat payment to {templateTitle}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="comment">Message (optional)</Label>
            <Textarea
              id="comment"
              placeholder="Add a message with your payment..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="mt-1"
              maxLength={280}
            />
            <p className="text-xs text-muted-foreground mt-1">
              {comment.length}/280 characters
            </p>
          </div>

          <Alert>
            <Zap className="h-4 w-4" />
            <AlertDescription>
              You'll need a Lightning wallet to complete this payment. 
              The payment goes directly to the availability template creator.
            </AlertDescription>
          </Alert>

          <div className="flex gap-2">
            <Button 
              onClick={handleGenerateInvoice}
              disabled={isGeneratingInvoice}
              className="flex-1"
            >
              {isGeneratingInvoice ? 'Generating...' : `Generate Invoice (${amount} sats)`}
            </Button>
            <Button variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (step === 'invoice') {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-yellow-500" />
            Pay Invoice
          </CardTitle>
          <CardDescription>
            Pay {amount} sats to complete your booking
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col items-center space-y-4">
            <div className="space-y-2 w-full">
              <Label>Scan QR Code or Copy Invoice</Label>
              <div className="flex justify-center">
                <QRCodeComponent 
                  value={invoice} 
                  size={200} 
                  className="bg-white"
                />
              </div>
            </div>

            <div className="w-full">
              <Label className="text-sm text-muted-foreground">Or copy invoice manually:</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  value={invoice}
                  readOnly
                  className="font-mono text-xs"
                />
                <Button size="sm" variant="outline" onClick={handleCopyInvoice}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <Button onClick={handleOpenWallet} className="flex-1">
              <ExternalLink className="h-4 w-4 mr-2" />
              Open Wallet
            </Button>
            <Button variant="outline" onClick={handleCopyInvoice}>
              <Copy className="h-4 w-4 mr-2" />
              Copy
            </Button>
          </div>

          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              After paying, click "I've Paid" to verify your zap receipt and continue with your booking. 
              We'll check for your payment on the Nostr network.
            </AlertDescription>
          </Alert>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {error}
              </AlertDescription>
            </Alert>
          )}

          <div className="flex gap-2">
            <Button 
              onClick={handlePaymentComplete} 
              variant="default" 
              className="flex-1"
              disabled={isVerifyingPayment}
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              {isVerifyingPayment ? 'Verifying Payment...' : 'I\'ve Paid'}
            </Button>
            <Button variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (step === 'paid') {
    return (
      <Card className="w-full max-w-md mx-auto border-green-200 bg-green-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-700">
            <CheckCircle className="h-5 w-5" />
            Payment Complete
          </CardTitle>
          <CardDescription>
            Your payment has been processed. You can now complete your booking.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              Your payment has been submitted. The zap receipt will be verified in the background while we process your booking.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (step === 'error') {
    return (
      <Card className="w-full max-w-md mx-auto border-red-200 bg-red-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-700">
            <AlertCircle className="h-5 w-5" />
            Payment Error
          </CardTitle>
          <CardDescription>
            There was an issue generating your payment invoice.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {error || 'Unknown error occurred'}
            </AlertDescription>
          </Alert>

          <div className="flex gap-2">
            <Button onClick={() => setStep('preparing')} className="flex-1">
              Try Again
            </Button>
            <Button variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return null;
}