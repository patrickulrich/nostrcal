import { useState, useEffect } from 'react';
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
}

export default function Bookings() {
  const { nostr } = useNostr();
  const { user } = useCurrentUser();
  const createRSVP = useCreateRSVP();
  const publishEvent = useCalendarPublish();
  const { privateEvents, createPrivateRSVP, isCreatingRSVP: _isCreatingRSVP } = usePrivateCalendarEvents();
  
  const [invitations, setInvitations] = useState<BookingInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentTab, setCurrentTab] = useState<'pending' | 'accepted' | 'declined'>('pending');
  const [respondingTo, setRespondingTo] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.pubkey) return;

    const loadInvitations = async () => {
      try {
        setLoading(true);
        setError(null);

        const signal = AbortSignal.timeout(10000);

        // Load public calendar events where user is tagged as participant
        const [timeEvents, dayEvents] = await Promise.all([
          nostr.query([{
            kinds: [31923], // Time-based events
            '#p': [user.pubkey],
            limit: 100
          }], { signal }),
          nostr.query([{
            kinds: [31922], // Date-based events
            '#p': [user.pubkey],
            limit: 100
          }], { signal })
        ]);

        // Load user's public RSVPs
        const rsvps = await nostr.query([{
          kinds: [31925],
          authors: [user.pubkey],
          limit: 100
        }], { signal });

        // Create RSVP map for quick lookup (both public and private)
        const rsvpMap = new Map<string, string>();
        rsvps.forEach(rsvp => {
          const eventCoordinate = rsvp.tags.find(t => t[0] === 'a')?.[1];
          const status = rsvp.tags.find(t => t[0] === 'status')?.[1];
          if (eventCoordinate && status) {
            rsvpMap.set(eventCoordinate, status);
          }
        });

        // Also check private RSVPs from private events
        privateEvents.filter(event => event.kind === 31925).forEach(rsvp => {
          const eventCoordinate = rsvp.tags.find(t => t[0] === 'a')?.[1];
          const status = rsvp.tags.find(t => t[0] === 'status')?.[1];
          if (eventCoordinate && status) {
            rsvpMap.set(eventCoordinate, status);
          }
        });

        // Process invitations
        const allInvitations: BookingInvitation[] = [];

        // Process public time-based events
        timeEvents.forEach(event => {
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
        dayEvents.forEach(event => {
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
        privateEvents.filter(event => 
          (event.kind === 31922 || event.kind === 31923) && 
          event.tags.some(t => t[0] === 'p' && t[1] === user.pubkey)
        ).forEach(event => {
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
        allInvitations.sort((a, b) => b.start.getTime() - a.start.getTime());

        setInvitations(allInvitations);
      } catch (err) {
        console.error('Failed to load invitations:', err);
        setError('Failed to load booking invitations');
      } finally {
        setLoading(false);
      }
    };

    loadInvitations();
  }, [user, nostr, privateEvents]);

  const handleRSVP = async (invitation: BookingInvitation, status: 'accepted' | 'declined' | 'tentative') => {
    if (!user?.pubkey) return;

    setRespondingTo(invitation.id);
    
    try {
      // Check if this is a private event by looking for the 🔒 prefix
      const isPrivateEvent = invitation.title.startsWith('🔒');
      
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
        // For public events, use regular RSVP
        await createRSVP.mutateAsync({
          eventCoordinate: invitation.eventCoordinate,
          eventId: invitation.eventId,
          status,
          eventAuthorPubkey: invitation.organizerPubkey,
          note: status === 'accepted' ? 'Looking forward to it!' : 'Sorry, I cannot attend.'
        });
      }

      // Auto-create busy block for accepted time-based events
      // Busy blocks (31927) are always public to show availability without revealing details
      if (status === 'accepted' && !invitation.isAllDay && invitation.start && invitation.end) {
        console.log('🚫 Creating public busy block for accepted event');
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
          console.log('✅ Public busy block created for accepted booking');
        } catch (busyBlockError) {
          console.error('Failed to create busy block:', busyBlockError);
          // Don't fail the entire operation if busy block creation fails
        }
      }

      // Update local state
      setInvitations(prev => prev.map(inv => 
        inv.id === invitation.id ? { ...inv, status } : inv
      ));
    } catch (err) {
      console.error('Failed to respond to invitation:', err);
      alert('Failed to send RSVP. Please try again.');
    } finally {
      setRespondingTo(null);
    }
  };

  const filterInvitations = () => {
    const now = new Date();
    const futureInvitations = invitations.filter(inv => inv.start > now);

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

  const filteredInvitations = filterInvitations();

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
                Pending ({invitations.filter(inv => !inv.status && inv.start > new Date()).length})
              </TabsTrigger>
              <TabsTrigger value="accepted" className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                Accepted ({invitations.filter(inv => inv.status === 'accepted' && inv.start > new Date()).length})
              </TabsTrigger>
              <TabsTrigger value="declined" className="flex items-center gap-2">
                <XCircle className="h-4 w-4" />
                Declined ({invitations.filter(inv => (inv.status === 'declined' || inv.status === 'tentative') && inv.start > new Date()).length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value={currentTab}>
              {filteredInvitations.length === 0 ? (
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
                    {filteredInvitations.map(invitation => (
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