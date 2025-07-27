import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { nip19 } from 'nostr-tools';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useZapVerification } from '@/hooks/useZapReceipts';
import { usePrivateCalendarEvents } from '@/hooks/usePrivateCalendarEvents';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  CalendarDays, 
  Link as LinkIcon, 
  AlertCircle, 
  Clock,
  Zap,
  CheckCircle,
  XCircle,
  HelpCircle,
  User,
  MessageSquare,
  MapPin 
} from 'lucide-react';
import { format } from 'date-fns';
import { useAuthor } from '@/hooks/useAuthor';
import { getDisplayNameWithLoadingState } from '@/utils/displayName';

// Custom hook to check payment status for a booking request
function useBookingPaymentStatus(request: BookingRequest, userPubkey?: string) {
  const { hasValidZap, isLoading } = useZapVerification(
    request.templateCoordinate,
    request.amount,
    userPubkey
  );


  return {
    hasPayment: hasValidZap,
    isLoadingPayment: isLoading,
    requiresPayment: !!(request.amount && request.amount > 0)
  };
}

// Component to handle individual booking request categorization
function BookingRequestWithPayment({ 
  request, 
  rsvp, 
  user,
  onCategorize 
}: { 
  request: BookingRequest; 
  rsvp: any; 
  user: any;
  onCategorize: (request: BookingRequest, category: 'pending' | 'pending-payment' | 'approved' | 'declined') => void;
}) {
  const { hasPayment, requiresPayment } = useBookingPaymentStatus(request, user?.pubkey);
  
  // Determine category based on RSVP and payment status
  React.useEffect(() => {
    let category: 'pending' | 'pending-payment' | 'approved' | 'declined';
    
    if (rsvp) {
      const status = rsvp.tags.find((t: any) => t[0] === 'status')?.[1];
      if (status === 'accepted') {
        category = 'approved';
      } else if (status === 'declined') {
        category = 'declined';
      } else {
        category = 'pending';
      }
    } else {
      // No RSVP yet - check payment status
      if (requiresPayment) {
        if (hasPayment) {
          category = 'pending'; // Payment made, waiting for organizer response
        } else {
          category = 'pending-payment'; // Payment required but not made
        }
      } else {
        category = 'pending'; // No payment required
      }
    }
    
    
    onCategorize(request, category);
  }, [rsvp, hasPayment, requiresPayment, request, onCategorize]);

  return null; // This is just a categorization component
}

interface BookingRequest {
  id: string;
  title: string;
  start: Date;
  end?: Date;
  location?: string;
  description?: string;
  organizerPubkey: string;
  status?: 'pending' | 'accepted' | 'declined';
  created_at: number;
  isAllDay: boolean;
  amount?: number;
  templateCoordinate?: string;
  template?: any; // Template data for payment checking
}

function BookingRequestCard({ request }: { request: BookingRequest }) {
  const { user } = useCurrentUser();
  const organizerProfile = useAuthor(request.organizerPubkey);
  const { hasPayment, isLoadingPayment, requiresPayment } = useBookingPaymentStatus(request, user?.pubkey);
  
  const organizerName = getDisplayNameWithLoadingState(
    request.organizerPubkey,
    organizerProfile.data?.metadata,
    organizerProfile.isLoading,
    !!organizerProfile.error
  );

  const formatTime = () => {
    if (request.isAllDay) {
      return format(request.start, 'EEEE, MMMM d, yyyy');
    } else {
      const dateStr = format(request.start, 'EEEE, MMMM d, yyyy');
      const timeStr = format(request.start, 'h:mm a');
      const endTimeStr = request.end ? ` - ${format(request.end, 'h:mm a')}` : '';
      return `${dateStr} at ${timeStr}${endTimeStr}`;
    }
  };

  const getStatusBadge = () => {
    switch (request.status) {
      case 'accepted':
        return (
          <Badge variant="default" className="bg-green-600">
            <CheckCircle className="h-3 w-3 mr-1" />
            Accepted
          </Badge>
        );
      case 'declined':
        return (
          <Badge variant="secondary">
            <XCircle className="h-3 w-3 mr-1" />
            Declined
          </Badge>
        );
      default:
        return (
          <Badge variant="outline">
            <HelpCircle className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        );
    }
  };

  return (
    <Card>
      <CardContent className="py-4">
        <div className="flex items-start justify-between">
          <div className="space-y-2 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-lg">{request.title}</h3>
              {request.isAllDay && (
                <Badge variant="secondary">All Day</Badge>
              )}
              {requiresPayment && (
                <Badge 
                  variant={hasPayment ? "default" : "destructive"} 
                  className={hasPayment ? "text-green-600" : "text-red-600"}
                >
                  <Zap className="h-3 w-3 mr-1" />
                  {request.amount} sats
                  {isLoadingPayment ? (
                    <span className="ml-1">...</span>
                  ) : hasPayment ? (
                    <CheckCircle className="h-3 w-3 ml-1" />
                  ) : (
                    <XCircle className="h-3 w-3 ml-1" />
                  )}
                </Badge>
              )}
            </div>
            
            <div className="space-y-1 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span>{formatTime()}</span>
              </div>
              
              {request.location && (
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  <span>{request.location}</span>
                </div>
              )}
              
              <div className="flex items-center gap-2">
                <User className="h-4 w-4" />
                <span>
                  To {organizerProfile.isLoading ? (
                    <span className="inline-block w-20 h-4 bg-muted animate-pulse rounded"></span>
                  ) : (
                    organizerName
                  )}
                </span>
              </div>
            </div>

            {request.description && (
              <div className="mt-2 text-sm">
                <div className="flex items-start gap-2">
                  <MessageSquare className="h-4 w-4 mt-0.5 text-muted-foreground" />
                  <p className="text-muted-foreground">{request.description}</p>
                </div>
              </div>
            )}
          </div>

          <div className="ml-4">
            {getStatusBadge()}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function BookingTabs() {
  const { user } = useCurrentUser();
  const { privateEvents } = usePrivateCalendarEvents();
  const navigate = useNavigate();
  
  // Naddr input state
  const [naddrInput, setNaddrInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  
  // Tab state for tracking outgoing booking requests
  const [currentTab, setCurrentTab] = useState<'pending' | 'pending-payment' | 'approved' | 'declined'>('pending');
  
  // State for categorized booking requests
  const [pendingRequests, setPendingRequests] = useState<BookingRequest[]>([]);
  const [pendingPaymentRequests, setPendingPaymentRequests] = useState<BookingRequest[]>([]);
  const [approvedRequests, setApprovedRequests] = useState<BookingRequest[]>([]);
  const [declinedRequests, setDeclinedRequests] = useState<BookingRequest[]>([]);

  // Callback to categorize booking requests
  const handleCategorizeRequest = useCallback((request: BookingRequest, category: 'pending' | 'pending-payment' | 'approved' | 'declined') => {
    // Remove from all categories first
    setPendingRequests(prev => prev.filter(r => r.id !== request.id));
    setPendingPaymentRequests(prev => prev.filter(r => r.id !== request.id));
    setApprovedRequests(prev => prev.filter(r => r.id !== request.id));
    setDeclinedRequests(prev => prev.filter(r => r.id !== request.id));
    
    // Add to appropriate category
    switch (category) {
      case 'pending':
        setPendingRequests(prev => [...prev, request]);
        break;
      case 'pending-payment':
        setPendingPaymentRequests(prev => [...prev, request]);
        break;
      case 'approved':
        setApprovedRequests(prev => [...prev, { ...request, status: 'accepted' }]);
        break;
      case 'declined':
        setDeclinedRequests(prev => [...prev, { ...request, status: 'declined' }]);
        break;
    }
  }, []);

  const handleNaddrSubmit = async (e: React.FormEvent) => {
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
    } catch (err) {
      console.error('Failed to parse naddr:', err);
      setError('Invalid booking link format');
      setIsValidating(false);
    }
  };

  // Get outgoing booking requests (events the current user has sent to others)
  const outgoingBookingRequests: BookingRequest[] = privateEvents
    .filter(event => 
      (event.kind === 31923 || event.kind === 31922) && 
      event.pubkey === user?.pubkey && // Created by current user
      event.tags.some(t => t[0] === 'p' && t[1] !== user?.pubkey) // Has other participants
    )
    .map(event => {
      const otherParticipant = event.tags.find(t => t[0] === 'p' && t[1] !== user?.pubkey)?.[1] || '';
      const aTag = event.tags.find(t => t[0] === 'a')?.[1]; // Availability template reference
      
      // Try to get amount from the booking request event tags
      const amountTag = event.tags.find(t => t[0] === 'amount')?.[1];
      const amount = amountTag ? parseInt(amountTag) : undefined;
      
      return {
        id: event.id,
        title: event.tags.find(t => t[0] === 'title')?.[1] || 'Booking Request',
        start: event.kind === 31923 
          ? new Date(parseInt(event.tags.find(t => t[0] === 'start')?.[1] || '0') * 1000)
          : new Date((event.tags.find(t => t[0] === 'start')?.[1] || '') + 'T00:00:00'),
        end: event.tags.find(t => t[0] === 'end')?.[1] 
          ? (event.kind === 31923 
             ? new Date(parseInt(event.tags.find(t => t[0] === 'end')?.[1] || '0') * 1000)
             : new Date((event.tags.find(t => t[0] === 'end')?.[1] || '') + 'T00:00:00'))
          : undefined,
        location: event.tags.find(t => t[0] === 'location')?.[1],
        description: event.content,
        organizerPubkey: otherParticipant, // The person we're requesting to book with
        status: 'pending', // Will be determined by checking for RSVP responses
        created_at: event.created_at,
        isAllDay: event.kind === 31922,
        templateCoordinate: aTag,
        amount: amount
      };
    });

  // Filter out past events and separate by status
  const now = new Date();
  const futureBookingRequests = outgoingBookingRequests.filter(req => req.start > now);
  
  // Get all RSVP events from private events to check status
  const rsvpEvents = privateEvents.filter(event => event.kind === 31925);
  
  // Create categorization components for each booking request
  const categorizationComponents = futureBookingRequests.map(request => {
    // Generate the booking event coordinate for RSVP matching
    const dTag = privateEvents.find(e => e.id === request.id)?.tags.find(t => t[0] === 'd')?.[1] || '';
    const bookingCoordinate = `${request.isAllDay ? '31922' : '31923'}:${user?.pubkey}:${dTag}`;
    
    // Look for RSVP responses to this booking request
    const rsvp = rsvpEvents.find(event => {
      const aTag = event.tags.find(t => t[0] === 'a')?.[1];
      return aTag === bookingCoordinate && event.pubkey !== user?.pubkey; // RSVP from organizer
    });

    return (
      <BookingRequestWithPayment
        key={request.id}
        request={request}
        rsvp={rsvp}
        user={user}
        onCategorize={handleCategorizeRequest}
      />
    );
  });

  if (!user) {
    return (
      <div className="container mx-auto p-4 max-w-4xl">
        <Card>
          <CardContent className="py-8">
            <div className="text-center">
              <h2 className="text-xl font-semibold mb-2">Login Required</h2>
              <p className="text-muted-foreground">Please log in to access booking features</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 max-w-4xl space-y-6">
      {/* Hidden categorization components */}
      {categorizationComponents}
      
      {/* Naddr Input Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LinkIcon className="h-5 w-5" />
            Book an Appointment
          </CardTitle>
          <CardDescription>
            Enter a booking link (naddr) to schedule an appointment
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleNaddrSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="naddr">Booking Link</Label>
              <Input
                id="naddr"
                type="text"
                placeholder="naddr1..."
                value={naddrInput}
                onChange={(e) => setNaddrInput(e.target.value)}
                disabled={isValidating}
              />
              {error && (
                <p className="text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle className="h-4 w-4" />
                  {error}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                Paste the booking link you received from someone's calendar
              </p>
            </div>
            
            <Button type="submit" disabled={isValidating || !naddrInput.trim()}>
              {isValidating ? 'Validating...' : 'Continue to Booking'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Booking Status Tracking Tabs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5" />
            My Booking Requests
          </CardTitle>
          <CardDescription>
            Track the status of your booking requests
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={currentTab} onValueChange={(value) => setCurrentTab(value as any)}>
            <TabsList className="grid w-full grid-cols-4 mb-6">
              <TabsTrigger value="pending" className="flex items-center gap-2">
                <HelpCircle className="h-4 w-4" />
                Pending ({pendingRequests.length})
              </TabsTrigger>
              <TabsTrigger value="pending-payment" className="flex items-center gap-2">
                <Zap className="h-4 w-4" />
                Payment ({pendingPaymentRequests.length})
              </TabsTrigger>
              <TabsTrigger value="approved" className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                Approved ({approvedRequests.length})
              </TabsTrigger>
              <TabsTrigger value="declined" className="flex items-center gap-2">
                <XCircle className="h-4 w-4" />
                Declined ({declinedRequests.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="pending">
              <div className="space-y-4">
                <Alert>
                  <HelpCircle className="h-4 w-4" />
                  <AlertDescription>
                    These are booking requests you've sent that are awaiting responses from organizers.
                  </AlertDescription>
                </Alert>
                
                {pendingRequests.length === 0 ? (
                  <Card className="border-dashed">
                    <CardContent className="py-8 text-center">
                      <p className="text-muted-foreground">No pending booking requests</p>
                    </CardContent>
                  </Card>
                ) : (
                  <ScrollArea className="h-[400px] pr-4">
                    <div className="space-y-4">
                      {pendingRequests.map(request => (
                        <BookingRequestCard key={request.id} request={request} />
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </div>
            </TabsContent>

            <TabsContent value="pending-payment">
              <div className="space-y-4">
                <Alert>
                  <Zap className="h-4 w-4" />
                  <AlertDescription>
                    Booking requests that require payment but haven't been paid yet.
                  </AlertDescription>
                </Alert>
                
                {pendingPaymentRequests.length === 0 ? (
                  <Card className="border-dashed">
                    <CardContent className="py-8 text-center">
                      <p className="text-muted-foreground">No pending payments</p>
                    </CardContent>
                  </Card>
                ) : (
                  <ScrollArea className="h-[400px] pr-4">
                    <div className="space-y-4">
                      {pendingPaymentRequests.map(request => (
                        <BookingRequestCard key={request.id} request={request} />
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </div>
            </TabsContent>

            <TabsContent value="approved">
              <div className="space-y-4">
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    Booking requests that have been approved by the organizers.
                  </AlertDescription>
                </Alert>
                
                {approvedRequests.length === 0 ? (
                  <Card className="border-dashed">
                    <CardContent className="py-8 text-center">
                      <p className="text-muted-foreground">No approved requests yet</p>
                    </CardContent>
                  </Card>
                ) : (
                  <ScrollArea className="h-[400px] pr-4">
                    <div className="space-y-4">
                      {approvedRequests.map(request => (
                        <BookingRequestCard key={request.id} request={request} />
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </div>
            </TabsContent>

            <TabsContent value="declined">
              <div className="space-y-4">
                <Alert>
                  <XCircle className="h-4 w-4" />
                  <AlertDescription>
                    Booking requests that have been declined by the organizers.
                  </AlertDescription>
                </Alert>
                
                {declinedRequests.length === 0 ? (
                  <Card className="border-dashed">
                    <CardContent className="py-8 text-center">
                      <p className="text-muted-foreground">No declined requests</p>
                    </CardContent>
                  </Card>
                ) : (
                  <ScrollArea className="h-[400px] pr-4">
                    <div className="space-y-4">
                      {declinedRequests.map(request => (
                        <BookingRequestCard key={request.id} request={request} />
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}