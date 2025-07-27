import { useState, useEffect, useMemo } from 'react';
import { useNostr } from '@nostrify/react';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useCreateRSVP, useCalendarPublish } from '@/hooks/useCalendarPublish';
import { usePrivateCalendarEvents } from '@/hooks/usePrivateCalendarEvents';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
// import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Calendar, 
  MapPin, 
  CheckCircle, 
  XCircle, 
  HelpCircle,
  User,
  MessageSquare
} from 'lucide-react';
import { format } from 'date-fns';
import { useAuthor } from '@/hooks/useAuthor';
import { getDisplayNameWithLoadingState } from '@/utils/displayName';
import { parseAvailabilityTemplate } from '@/utils/parseAvailabilityTemplate';
import { parseZapReceipt, isZapForAvailabilityTemplate } from '@/utils/nip57';

interface BookingInvitationCardProps {
  invitation: BookingInvitation;
  currentTab: 'pending' | 'accepted' | 'declined';
  onRSVP: (invitation: BookingInvitation, status: 'accepted' | 'declined' | 'tentative') => void;
  isResponding: boolean;
}

function BookingInvitationCard({ invitation, currentTab, onRSVP, isResponding }: BookingInvitationCardProps) {
  const organizerProfile = useAuthor(invitation.organizerPubkey);
  
  const organizerName = getDisplayNameWithLoadingState(
    invitation.organizerPubkey,
    organizerProfile.data?.metadata,
    organizerProfile.isLoading,
    !!organizerProfile.error
  );

  const formatEventTime = (invitation: BookingInvitation) => {
    if (invitation.isAllDay) {
      return format(invitation.start, 'EEEE, MMMM d, yyyy');
    } else {
      const dateStr = format(invitation.start, 'EEEE, MMMM d, yyyy');
      const timeStr = format(invitation.start, 'h:mm a');
      const endTimeStr = invitation.end ? ` - ${format(invitation.end, 'h:mm a')}` : '';
      return `${dateStr} at ${timeStr}${endTimeStr}`;
    }
  };

  return (
    <Card>
      <CardContent className="py-4">
        <div className="flex items-start justify-between">
          <div className="space-y-2 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-lg">{invitation.title}</h3>
              {invitation.isAllDay && (
                <Badge variant="secondary">All Day</Badge>
              )}
              {invitation.isPaid && (
                <Badge variant="default" className="bg-green-600 text-white">
                  💰 {invitation.paidAmount} sats
                </Badge>
              )}
            </div>
            
            <div className="space-y-1 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span>{formatEventTime(invitation)}</span>
              </div>
              
              {invitation.location && (
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  <span>{invitation.location}</span>
                </div>
              )}
              
              <div className="flex items-center gap-2">
                <User className="h-4 w-4" />
                <span>
                  Organized by {organizerProfile.isLoading ? (
                    <span className="inline-block w-20 h-4 bg-muted animate-pulse rounded"></span>
                  ) : (
                    organizerName
                  )}
                </span>
              </div>
            </div>

            {invitation.description && (
              <div className="mt-2 text-sm">
                <div className="flex items-start gap-2">
                  <MessageSquare className="h-4 w-4 mt-0.5 text-muted-foreground" />
                  <p className="text-muted-foreground">{invitation.description}</p>
                </div>
              </div>
            )}
          </div>

          {currentTab === 'pending' && (
            <div className="flex gap-2 ml-4">
              <Button
                size="sm"
                onClick={() => onRSVP(invitation, 'accepted')}
                disabled={isResponding}
              >
                <CheckCircle className="h-4 w-4 mr-1" />
                Accept
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onRSVP(invitation, 'declined')}
                disabled={isResponding}
              >
                <XCircle className="h-4 w-4 mr-1" />
                Decline
              </Button>
            </div>
          )}

          {currentTab === 'accepted' && (
            <Badge variant="default" className="ml-4">
              <CheckCircle className="h-4 w-4 mr-1" />
              Accepted
            </Badge>
          )}

          {currentTab === 'declined' && (
            <Badge variant="secondary" className="ml-4">
              <XCircle className="h-4 w-4 mr-1" />
              {invitation.status === 'tentative' ? 'Maybe' : 'Declined'}
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

interface BookingInvitation {
  id: string;
  eventId: string;
  eventCoordinate: string;
  title: string;
  start: Date;
  end?: Date;
  location?: string;
  description?: string;
  organizerPubkey: string;
  organizerName?: string;
  status?: 'accepted' | 'declined' | 'tentative';
  note?: string;
  isAllDay: boolean;
  created_at: number;
  isPaid?: boolean;
  paidAmount?: number; // in sats
}

export default function Bookings() {
  const { nostr } = useNostr();
  const { user } = useCurrentUser();
  const _createRSVP = useCreateRSVP();
  const publishEvent = useCalendarPublish();
  const { privateEvents, createPrivateRSVP, isCreatingRSVP: _isCreatingRSVP } = usePrivateCalendarEvents();
  
  // Separate state for public events (loaded once)
  const [publicEvents, setPublicEvents] = useState<{timeEvents: any[], dayEvents: any[], rsvps: any[]}>({
    timeEvents: [], 
    dayEvents: [], 
    rsvps: []
  });
  const [publicLoading, setPublicLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentTab, setCurrentTab] = useState<'pending' | 'accepted' | 'declined'>('pending');
  const [respondingTo, setRespondingTo] = useState<string | null>(null);

  // CONCERN 1: Load public events only once when user changes
  useEffect(() => {
    if (!user?.pubkey) {
      setPublicEvents({timeEvents: [], dayEvents: [], rsvps: []});
      setPublicLoading(false);
      return;
    }

    const loadPublicEvents = async () => {
      try {
        setPublicLoading(true);
        setError(null);

        const signal = AbortSignal.timeout(10000);

        // Load public calendar events where user is tagged as participant
        const [timeEvents, dayEvents, rsvps] = await Promise.all([
          nostr.query([{
            kinds: [31923], // Time-based events
            '#p': [user.pubkey],
            limit: 100
          }], { signal }),
          nostr.query([{
            kinds: [31922], // Date-based events
            '#p': [user.pubkey],
            limit: 100
          }], { signal }),
          nostr.query([{
            kinds: [31925], // User's public RSVPs
            authors: [user.pubkey],
            limit: 100
          }], { signal })
        ]);


        setPublicEvents({ timeEvents, dayEvents, rsvps });
      } catch (err) {
        console.error('Failed to load public events:', err);
        setError('Failed to load booking invitations');
      } finally {
        setPublicLoading(false);
      }
    };

    loadPublicEvents();
  }, [user?.pubkey, nostr]); // Only reload when user or nostr changes, NOT when privateEvents change

  // State for filtered invitations
  const [filteredInvitations, setFilteredInvitations] = useState<BookingInvitation[]>([]);

  // CONCERN 3: Combine public + private data (no network calls, just processing)
  const invitations = useMemo(() => {
    if (!user?.pubkey) return [];

    try {
      // Create RSVP map for quick lookup (both public and private)
      const rsvpMap = new Map<string, string>();
      
      // Add public RSVPs
      publicEvents.rsvps.forEach(rsvp => {
        const eventCoordinate = rsvp.tags.find(t => t[0] === 'a')?.[1];
        const status = rsvp.tags.find(t => t[0] === 'status')?.[1];
        if (eventCoordinate && status) {
          rsvpMap.set(eventCoordinate, status);
        }
      });

      // Add private RSVPs from private events
      const privateRSVPs = privateEvents.filter(event => event.kind === 31925);
      privateRSVPs.forEach(rsvp => {
        const eventCoordinate = rsvp.tags.find(t => t[0] === 'a')?.[1];
        const status = rsvp.tags.find(t => t[0] === 'status')?.[1];
        if (eventCoordinate && status) {
          rsvpMap.set(eventCoordinate, status);
        }
      });

      const allInvitations: BookingInvitation[] = [];

      // Process public time-based events
      publicEvents.timeEvents.forEach(event => {
        const dTag = event.tags.find(t => t[0] === 'd')?.[1];
        if (!dTag) return;

        // Skip events created by the current user
        if (event.pubkey === user.pubkey) return;

        const coordinate = `31923:${event.pubkey}:${dTag}`;
        const status = rsvpMap.get(coordinate) as 'accepted' | 'declined' | 'tentative' | undefined;

        const title = event.tags.find(t => t[0] === 'title')?.[1] || 'Untitled Event';
        const start = event.tags.find(t => t[0] === 'start')?.[1];
        const end = event.tags.find(t => t[0] === 'end')?.[1];
        const location = event.tags.find(t => t[0] === 'location')?.[1];

        if (start) {
          allInvitations.push({
            id: event.id,
            eventId: event.id,
            eventCoordinate: coordinate,
            title,
            start: new Date(parseInt(start) * 1000),
            end: end ? new Date(parseInt(end) * 1000) : undefined,
            location,
            description: event.content,
            organizerPubkey: event.pubkey,
            status,
            isAllDay: false,
            created_at: event.created_at
          });
        }
      });

      // Process public date-based events
      publicEvents.dayEvents.forEach(event => {
        const dTag = event.tags.find(t => t[0] === 'd')?.[1];
        if (!dTag) return;

        // Skip events created by the current user
        if (event.pubkey === user.pubkey) return;

        const coordinate = `31922:${event.pubkey}:${dTag}`;
        const status = rsvpMap.get(coordinate) as 'accepted' | 'declined' | 'tentative' | undefined;

        const title = event.tags.find(t => t[0] === 'title')?.[1] || 'Untitled Event';
        const start = event.tags.find(t => t[0] === 'start')?.[1];
        const end = event.tags.find(t => t[0] === 'end')?.[1];
        const location = event.tags.find(t => t[0] === 'location')?.[1];

        if (start) {
          allInvitations.push({
            id: event.id,
            eventId: event.id,
            eventCoordinate: coordinate,
            title,
            start: new Date(start + 'T00:00:00'),
            end: end ? new Date(end + 'T00:00:00') : undefined,
            location,
            description: event.content,
            organizerPubkey: event.pubkey,
            status,
            isAllDay: true,
            created_at: event.created_at
          });
        }
      });

      // Process private calendar events (gift-wrapped)
      const privateCalendarEvents = privateEvents.filter(event => 
        (event.kind === 31922 || event.kind === 31923) && 
        event.tags.some(t => t[0] === 'p' && t[1] === user.pubkey)
      );


      privateCalendarEvents.forEach(event => {
        const dTag = event.tags.find(t => t[0] === 'd')?.[1];
        if (!dTag) return;

        // Skip events created by the current user
        if (event.pubkey === user.pubkey) return;

        const coordinate = `${event.kind}:${event.pubkey}:${dTag}`;
        const status = rsvpMap.get(coordinate) as 'accepted' | 'declined' | 'tentative' | undefined;

        const title = event.tags.find(t => t[0] === 'title')?.[1] || 'Private Event';
        const start = event.tags.find(t => t[0] === 'start')?.[1];
        const end = event.tags.find(t => t[0] === 'end')?.[1];
        const location = event.tags.find(t => t[0] === 'location')?.[1];

        if (start) {
          const isTimeEvent = event.kind === 31923;
          allInvitations.push({
            id: event.id,
            eventId: event.id,
            eventCoordinate: coordinate,
            title: `🔒 ${title}`, // Indicate private event
            start: isTimeEvent ? new Date(parseInt(start) * 1000) : new Date(start + 'T00:00:00'),
            end: end ? (isTimeEvent ? new Date(parseInt(end) * 1000) : new Date(end + 'T00:00:00')) : undefined,
            location,
            description: event.content,
            organizerPubkey: event.pubkey,
            status,
            isAllDay: !isTimeEvent,
            created_at: event.created_at
          });
        }
      });

      // Sort by start date (newest first)
      const sortedInvitations = allInvitations.sort((a, b) => b.start.getTime() - a.start.getTime());


      return sortedInvitations;
    } catch (err) {
      console.error('Failed to process invitations:', err);
      return [];
    }
  }, [user?.pubkey, publicEvents, privateEvents]); // Recalculate when either public or private data changes

  // Filter invitations based on payment verification
  useEffect(() => {
    const filterInvitations = async () => {
      if (!user?.pubkey || invitations.length === 0) {
        setFilteredInvitations(invitations);
        return;
      }


      const filtered: BookingInvitation[] = [];
      
      for (const invitation of invitations) {
        // Check if invitation has an 'a' tag reference to availability template
        // For private events, we need to look at the original rumor to find the 'a' tag
        const originalEvent = privateEvents.find(e => e.id === invitation.eventId);
        const aTag = originalEvent?.tags.find(t => t[0] === 'a')?.[1];
        
        if (!aTag) {
          // No template reference, show the invitation (not paid)
          filtered.push({ ...invitation, isPaid: false });
          continue;
        }

        try {
          // Fetch the availability template to check if it requires payment
          const templateEvents = await nostr.query([{
            kinds: [31926],
            '#d': [aTag.split(':')[2]], // extract identifier from coordinate
            authors: [aTag.split(':')[1]], // extract pubkey from coordinate
            limit: 1
          }], { signal: AbortSignal.timeout(2000) });
          
          if (templateEvents.length === 0) {
            // Template not found, show the invitation
            filtered.push(invitation);
            continue;
          }
          
          const template = parseAvailabilityTemplate(templateEvents[0]);
          if (!template.amount || template.amount <= 0) {
            // No payment required, show the invitation
            filtered.push(invitation);
            continue;
          }
          
          // Check if user has valid zap receipt for this template
          // Use the same multi-relay approach that works in LightningPayment
          const popularZapRelays = [
            'wss://relay.nostr.band',
            'wss://nostr.wine', 
            'wss://relay.snort.social',
            'wss://relay.damus.io',
            'wss://nos.lol',
            'wss://relay.primal.net',
            'wss://relay.nostrcal.com'
          ];

          const recipientPubkey = aTag.split(':')[1];

          const [templateZaps, recipientZaps] = await Promise.all([
            // Query by template coordinate
            nostr.query([{
              kinds: [9735], // zap receipts
              '#a': [aTag], // referencing the availability template
              limit: 10
            }], { 
              signal: AbortSignal.timeout(5000),
              relays: popularZapRelays
            }),
            
            // Query for zap receipts TO the template recipient
            nostr.query([{
              kinds: [9735], // zap receipts
              '#p': [recipientPubkey], // zapped TO this person
              since: Math.floor(Date.now() / 1000) - 3600, // Last hour
              limit: 20
            }], { 
              signal: AbortSignal.timeout(5000),
              relays: popularZapRelays
            })
          ]);

          // Combine and deduplicate zap events
          const allZapEventIds = new Set();
          const zapEvents = [...templateZaps, ...recipientZaps].filter(event => {
            if (allZapEventIds.has(event.id)) return false;
            allZapEventIds.add(event.id);
            return true;
          });
          
          // Check if any zap receipt meets the required amount using our working logic
          const hasValidZap = zapEvents.some(zapEvent => {
            const parsed = parseZapReceipt(zapEvent);
            if (!parsed || !parsed.isValid) return false;
            
            // For bookings page, we check if someone paid TO the organizer (current user)
            // parsed.recipient should be the current user (organizer)
            // parsed.sender is the person who made the booking and payment
            return parsed.recipient === user.pubkey &&
              template.amount &&
              isZapForAvailabilityTemplate(parsed, aTag, template.amount);
          });
          
          if (hasValidZap) {
            // Mark as paid since it came from a paid template and payment was verified
            filtered.push({ ...invitation, isPaid: true, paidAmount: template.amount });
          }
          
        } catch (error) {
          console.error('Error checking payment requirements for invitation:', invitation.id, error);
          // On error, show the invitation to avoid hiding valid requests (not paid)
          filtered.push({ ...invitation, isPaid: false });
        }
      }
      
      
      setFilteredInvitations(filtered);
    };

    filterInvitations();
  }, [invitations, user?.pubkey, privateEvents, nostr]);

  // Combined loading state
  const loading = publicLoading;

  const handleRSVP = async (invitation: BookingInvitation, status: 'accepted' | 'declined' | 'tentative') => {
    if (!user?.pubkey) return;

    setRespondingTo(invitation.id);
    
    try {
      // Check if this is a private event by looking for the 🔒 prefix
      const isPrivateEvent = invitation.title.startsWith('🔒');
      
      // All RSVPs on /bookings page should be gift wrapped (private)
      // The only place we create public RSVPs is on /events page
      
      if (isPrivateEvent) {
        // For private events, find the original rumor event to send private RSVP
        const originalEvent = privateEvents.find(e => e.id === invitation.eventId);
        if (originalEvent) {
          await createPrivateRSVP({
            originalEvent,
            status,
            content: status === 'accepted' ? 'Looking forward to it!' : 'Sorry, I cannot attend.'
          });
        } else {
          throw new Error('Original private event not found');
        }
      } else {
        // For public events on /bookings, still use gift-wrapped RSVP
        // We need to create a rumor from the public event to send private RSVP
        const publicEvent = [...invitations].find(inv => inv.eventId === invitation.eventId);
        if (publicEvent) {
          // Create a rumor-like object from the public event data
          const rumorFromPublicEvent = {
            id: publicEvent.eventId,
            kind: publicEvent.eventCoordinate.startsWith('31923:') ? 31923 : 31922,
            pubkey: publicEvent.organizerPubkey,
            created_at: publicEvent.created_at,
            content: publicEvent.description || '',
            tags: [
              ['d', publicEvent.eventCoordinate.split(':')[2]],
              ['title', publicEvent.title],
              ['p', user.pubkey] // Include current user as participant
            ]
          };
          
          await createPrivateRSVP({
            originalEvent: rumorFromPublicEvent,
            status,
            content: status === 'accepted' ? 'Looking forward to it!' : 'Sorry, I cannot attend.'
          });
        } else {
          throw new Error('Original public event not found for gift wrapping');
        }
      }

      // Auto-create busy block for accepted time-based events
      // Busy blocks (31927) are always public to show availability without revealing details
      if (status === 'accepted' && !invitation.isAllDay && invitation.start && invitation.end) {
        try {
          const startTimestamp = Math.floor(invitation.start.getTime() / 1000);
          const endTimestamp = Math.floor(invitation.end.getTime() / 1000);
          
          await publishEvent.mutateAsync({
            kind: 31927,
            title: '', // Busy blocks don't need titles
            start: startTimestamp.toString(),
            end: endTimestamp.toString(),
            description: '', // Keep busy slots private - no details
            isPrivate: false // Busy slots are always public so others can see availability
          });
        } catch (busyBlockError) {
          console.error('Failed to create busy block:', busyBlockError);
          // Don't fail the entire operation if busy block creation fails
        }
      }

      // For public RSVPs, refresh the public RSVP data to pick up the new RSVP
      // Private RSVPs will be picked up automatically when the private event stream updates
      if (!isPrivateEvent) {
        try {
          const signal = AbortSignal.timeout(5000);
          const rsvps = await nostr.query([{
            kinds: [31925],
            authors: [user.pubkey],
            limit: 100
          }], { signal });
          
          setPublicEvents(prev => ({ ...prev, rsvps }));
        } catch (refreshError) {
          console.error('Failed to refresh public RSVPs:', refreshError);
          // Don't fail the entire operation for this
        }
      }
    } catch (err) {
      console.error('Failed to respond to invitation:', err);
      alert('Failed to send RSVP. Please try again.');
    } finally {
      setRespondingTo(null);
    }
  };

  const filterInvitationsByTab = () => {
    const now = new Date();
    const futureInvitations = filteredInvitations.filter(inv => inv.start > now);

    switch (currentTab) {
      case 'pending':
        return futureInvitations.filter(inv => !inv.status);
      case 'accepted':
        return futureInvitations.filter(inv => inv.status === 'accepted');
      case 'declined':
        return futureInvitations.filter(inv => inv.status === 'declined' || inv.status === 'tentative');
      default:
        return [];
    }
  };

  if (!user) {
    return (
      <div className="container mx-auto p-4 max-w-4xl">
        <Card>
          <CardContent className="py-8">
            <div className="text-center">
              <h2 className="text-xl font-semibold mb-2">Login Required</h2>
              <p className="text-muted-foreground">Please log in to view your booking invitations</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container mx-auto p-4 max-w-4xl">
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-64 mt-2" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <Card key={i}>
                  <CardContent className="py-4">
                    <div className="space-y-2">
                      <Skeleton className="h-6 w-64" />
                      <Skeleton className="h-4 w-48" />
                      <Skeleton className="h-4 w-32" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-4 max-w-4xl">
        <Card>
          <CardContent className="py-8">
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  const tabFilteredInvitations = filterInvitationsByTab();

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle>Booking Invitations</CardTitle>
          <CardDescription>
            Manage your calendar event invitations and RSVPs
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={currentTab} onValueChange={(value) => setCurrentTab(value as 'pending' | 'accepted' | 'declined')}>
            <TabsList className="grid w-full grid-cols-3 mb-6">
              <TabsTrigger value="pending" className="flex items-center gap-2">
                <HelpCircle className="h-4 w-4" />
                Pending ({filteredInvitations.filter(inv => !inv.status && inv.start > new Date()).length})
              </TabsTrigger>
              <TabsTrigger value="accepted" className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                Accepted ({filteredInvitations.filter(inv => inv.status === 'accepted' && inv.start > new Date()).length})
              </TabsTrigger>
              <TabsTrigger value="declined" className="flex items-center gap-2">
                <XCircle className="h-4 w-4" />
                Declined ({filteredInvitations.filter(inv => (inv.status === 'declined' || inv.status === 'tentative') && inv.start > new Date()).length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value={currentTab}>
              {tabFilteredInvitations.length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="py-8 text-center">
                    <p className="text-muted-foreground">
                      {currentTab === 'pending' 
                        ? 'No pending invitations'
                        : currentTab === 'accepted'
                        ? 'No accepted invitations'
                        : 'No declined invitations'
                      }
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <ScrollArea className="h-[500px] pr-4">
                  <div className="space-y-4">
                    {tabFilteredInvitations.map(invitation => (
                      <BookingInvitationCard
                        key={invitation.id}
                        invitation={invitation}
                        currentTab={currentTab}
                        onRSVP={handleRSVP}
                        isResponding={respondingTo === invitation.id}
                      />
                    ))}
                  </div>
                </ScrollArea>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}