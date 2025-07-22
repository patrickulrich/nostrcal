import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { nip19 } from 'nostr-tools';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CalendarDays, Link as LinkIcon, AlertCircle } from 'lucide-react';

export function BookingNaddrInput() {
  const [naddrInput, setNaddrInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!naddrInput.trim()) {
      setError('Please enter a booking link');
      return;
    }

    setIsValidating(true);
    setError(null);

    try {
      // Clean up the input - remove nostr: prefix if present
      const cleanNaddr = naddrInput.trim().replace(/^nostr:/, '');
      
      // Validate the naddr format
      const decoded = nip19.decode(cleanNaddr);
      
      if (decoded.type !== 'naddr') {
        setError('Please enter a valid naddr booking link');
        setIsValidating(false);
        return;
      }

      const naddr_data = decoded.data;
      
      // Check if it's a booking availability template (kind 31926)
      if (naddr_data.kind !== 31926) {
        setError('This naddr is not a booking availability template');
        setIsValidating(false);
        return;
      }

      // Navigate to the booking page with the naddr
      navigate(`/booking/${cleanNaddr}`);
      
    } catch (error) {
      console.error('Error validating naddr:', error);
      setError('Invalid booking link format');
      setIsValidating(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNaddrInput(e.target.value);
    if (error) {
      setError(null);
    }
  };

  return (
    <div className="container mx-auto p-4 max-w-2xl">
      <div className="space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold flex items-center justify-center gap-2">
            <CalendarDays className="h-8 w-8" />
            Booking System
          </h1>
          <p className="text-muted-foreground mt-2">
            Enter a booking link to schedule an appointment
          </p>
        </div>

        {/* Input Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LinkIcon className="h-5 w-5" />
              Enter Booking Link
            </CardTitle>
            <CardDescription>
              Paste your booking naddr or nostr: link to get started
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="naddr-input">Booking Link (naddr)</Label>
                <Input
                  id="naddr-input"
                  type="text"
                  placeholder="naddr1... or nostr:naddr1..."
                  value={naddrInput}
                  onChange={handleInputChange}
                  className={error ? 'border-red-500' : ''}
                  disabled={isValidating}
                />
                <p className="text-xs text-muted-foreground">
                  Example: naddr1qvzqqqrcvypzq...
                </p>
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button 
                type="submit" 
                className="w-full" 
                disabled={isValidating || !naddrInput.trim()}
              >
                {isValidating ? 'Validating...' : 'Load Booking Page'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Help Section */}
        <Card className="border-dashed">
          <CardContent className="pt-6">
            <div className="space-y-3">
              <h3 className="font-medium">What is a booking link?</h3>
              <div className="text-sm text-muted-foreground space-y-2">
                <p>
                  Booking links are special Nostr addresses (naddr) that contain availability templates. 
                  They allow you to book time slots with someone who has shared their availability.
                </p>
                <div className="space-y-1">
                  <p className="font-medium">Supported formats:</p>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li><code>naddr1...</code> - Direct naddr format</li>
                    <li><code>nostr:naddr1...</code> - Nostr URI format</li>
                  </ul>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}