import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useNostr } from '@nostrify/react';
import { nip19 } from 'nostr-tools';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { usePrivateCalendarPublish } from '@/hooks/usePrivateCalendarPublish';
// import { useRelayPreferences } from '@/hooks/useRelayPreferences';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CalendarDays, Clock, MapPin, Zap } from 'lucide-react';
import { format, addDays, setHours, setMinutes } from 'date-fns';
import { parseAvailabilityTemplate } from '@/utils/parseAvailabilityTemplate';

interface AvailabilityTemplate {
  id: string;
  title: string;
  description?: string;
  duration: number; // minutes
  interval?: number; // minutes - gap between slot starts
  bufferBefore?: number; // minutes
  bufferAfter?: number; // minutes
  timezone: string;
  location?: string;
  availability: {
    [day: string]: { start: string; end: string }[];
  };
  pubkey: string;
  calendarRef?: string;
  amount?: number; // satoshis for paid bookings
  minNotice?: number; // minutes
  maxAdvance?: number; // minutes
  maxAdvanceBusiness?: boolean;
}

interface TimeSlot {
  start: Date;
  end: Date;
  available: boolean;
}

export default function Booking() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { nostr } = useNostr();
  const { user } = useCurrentUser();
  const { publishPrivateTimeEvent: _publishPrivateTimeEvent, isPublishing } = usePrivateCalendarPublish();
  
  const [step, setStep] = useState<'loading' | 'selecting' | 'booking' | 'confirming' | 'success' | 'error'>('loading');
  const [template, setTemplate] = useState<AvailabilityTemplate | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [busyTimes, setBusyTimes] = useState<Map<string, { start: Date; end: Date }[]>>(new Map());
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [bookingNote, setBookingNote] = useState('');
  const [participantName, setParticipantName] = useState('');
  const [participantEmail, setParticipantEmail] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Parse naddr from URL
  useEffect(() => {
    const loadTemplate = async () => {
      try {
        const naddr = searchParams.get('naddr');
        if (!naddr) {
          setError('No booking link provided');
          setStep('error');
          return;
        }

        // Decode naddr
        const decoded = nip19.decode(naddr);
        if (decoded.type !== 'naddr') {
          setError('Invalid booking link');
          setStep('error');
          return;
        }

        const { kind, pubkey, identifier } = decoded.data;
        if (kind !== 31926) {
          setError('Invalid booking link type');
          setStep('error');
          return;
        }

        // Fetch availability template
        const signal = AbortSignal.timeout(5000);
        const events = await nostr.query([{
          kinds: [31926],
          authors: [pubkey],
          '#d': [identifier],
          limit: 1
        }], { signal });

        if (events.length === 0) {
          setError('Booking template not found');
          setStep('error');
          return;
        }

        const event = events[0];
        const templateData = parseAvailabilityTemplate(event);
        setTemplate(templateData);

        // Fetch busy times (availability blocks)
        const busyEvents = await nostr.query([{
          kinds: [31927],
          authors: [pubkey],
          limit: 100
        }], { signal });

        const busyMap = new Map<string, { start: Date; end: Date }[]>();
        busyEvents.forEach(busyEvent => {
          const start = busyEvent.tags.find(t => t[0] === 'start')?.[1];
          const end = busyEvent.tags.find(t => t[0] === 'end')?.[1];
          if (start && end) {
            const startTimestamp = parseInt(start);
            const endTimestamp = parseInt(end);
            
            // Validate timestamps
            if (isNaN(startTimestamp) || isNaN(endTimestamp)) {
              return;
            }
            
            const startDate = new Date(startTimestamp * 1000);
            const endDate = new Date(endTimestamp * 1000);
            
            // Validate Date objects
            if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
              return;
            }
            
            const dateKey = format(startDate, 'yyyy-MM-dd');
            
            if (!busyMap.has(dateKey)) {
              busyMap.set(dateKey, []);
            }
            busyMap.get(dateKey)!.push({ start: startDate, end: endDate });
          }
        });
        setBusyTimes(busyMap);

        setStep('selecting');
      } catch (err) {
        console.error('Failed to load booking template:', err);
        setError('Failed to load booking information');
        setStep('error');
      }
    };

    loadTemplate();
  }, [searchParams, nostr, setError, setStep, setTemplate, setBusyTimes]);

  // Calculate available slots when date is selected
  useEffect(() => {
    if (!selectedDate || !template) {
      setAvailableSlots([]);
      return;
    }

    if (!template.availability || Object.keys(template.availability).length === 0) {
      setAvailableSlots([]);
      return;
    }

    const dayOfWeek = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'][selectedDate.getDay()];
    const dayAvailability = template.availability[dayOfWeek] || [];
    
    if (dayAvailability.length === 0) {
      setAvailableSlots([]);
      return;
    }

    const slots: TimeSlot[] = [];
    const dateKey = format(selectedDate, 'yyyy-MM-dd');
    const dayBusyTimes = busyTimes.get(dateKey) || [];

    dayAvailability.forEach((block) => {
      // Validate time format and parse safely
      const timeRegex = /^([0-1]?[0-9]|2[0-3]):([0-5][0-9])$/;
      const startMatch = block.start.match(timeRegex);
      const endMatch = block.end.match(timeRegex);
      
      if (!startMatch || !endMatch) {
        return;
      }
      
      const startHour = parseInt(startMatch[1]);
      const startMin = parseInt(startMatch[2]);
      const endHour = parseInt(endMatch[1]);
      const endMin = parseInt(endMatch[2]);
      
      // Validate parsed values are in valid ranges
      if (startHour < 0 || startHour > 23 || startMin < 0 || startMin > 59 ||
          endHour < 0 || endHour > 23 || endMin < 0 || endMin > 59) {
        return;
      }
      
      try {
        let currentTime = setMinutes(setHours(selectedDate, startHour), startMin);
        const blockEnd = setMinutes(setHours(selectedDate, endHour), endMin);

      while (currentTime < blockEnd) {
        const slotEnd = new Date(currentTime.getTime() + template.duration * 60000);
        
        if (slotEnd <= blockEnd) {
          // Check if slot conflicts with busy times
          const isBusy = dayBusyTimes.some(busy => 
            (currentTime >= busy.start && currentTime < busy.end) ||
            (slotEnd > busy.start && slotEnd <= busy.end) ||
            (currentTime <= busy.start && slotEnd >= busy.end)
          );

          // Check minimum notice
          const now = new Date();
          const minNoticeTime = template.minNotice ? 
            new Date(now.getTime() + template.minNotice * 60000) : now;
          const meetsMinNotice = currentTime >= minNoticeTime;

          slots.push({
            start: currentTime,
            end: slotEnd,
            available: !isBusy && meetsMinNotice
          });
        }

        // Move to next slot start (use interval or duration as fallback)
        const intervalMinutes = template.interval || template.duration;
        currentTime = new Date(currentTime.getTime() + intervalMinutes * 60000);
      }
      } catch {
        return;
      }
    });

    setAvailableSlots(slots);
  }, [selectedDate, template, busyTimes]);

  const handleBooking = async () => {
    if (!template || !selectedSlot || !participantName || !user?.signer) return;

    setStep('confirming');
    
    try {
      console.log('🔐 Creating private booking request');
      
      // Get calendar owner's relay preferences for broadcasting
      const ownerRelayPrefs = await getOwnerRelayPreferences(template.pubkey);
      console.log('📡 Owner relay preferences:', ownerRelayPrefs);
      
      // Create private booking event (kind 31923) with both participants
      const participants = [template.pubkey]; // Calendar owner as participant
      
      const bookingTitle = `Booking: ${template.title}`;
      const bookingDescription = `Booking request from ${participantName}${participantEmail ? ` (${participantEmail})` : ''}.\n\nMessage: ${bookingNote || 'No message'}`;
      
      console.log('📅 Creating private time event with participants:', participants);
      
      // Create the private event with custom relay broadcasting
      await createPrivateBookingWithOwnerRelays({
        title: bookingTitle,
        description: bookingDescription,
        start: Math.floor(selectedSlot.start.getTime() / 1000),
        end: Math.floor(selectedSlot.end.getTime() / 1000),
        location: template.location,
        timezone: template.timezone,
        participants,
        ownerRelays: ownerRelayPrefs
      });
      
      console.log('✅ Private booking request created and broadcasted to owner relays');
      
      // Note: The availability block (31927) should be created by the calendar owner
      // when they accept the booking, not by the requester
      
      setStep('success');
    } catch (err) {
      console.error('❌ Booking failed:', err);
      setError('Failed to create booking. Please try again.');
      setStep('error');
    }
  };
  
  const getOwnerRelayPreferences = async (ownerPubkey: string) => {
    try {
      // Fetch the calendar owner's relay preferences (kind 10050)
      const signal = AbortSignal.timeout(5000);
      const relayPrefEvents = await nostr.query([{
        kinds: [10050],
        authors: [ownerPubkey],
        limit: 1
      }], { signal });
      
      if (relayPrefEvents.length > 0) {
        const event = relayPrefEvents[0];
        const relays = event.tags
          .filter(t => t[0] === 'r')
          .map(t => ({ url: t[1], read: t[2] !== 'write', write: t[2] !== 'read' }));
        return relays;
      }
      
      return [];
    } catch (err) {
      console.error('Failed to fetch owner relay preferences:', err);
      return [];
    }
  };
  
  const createPrivateBookingWithOwnerRelays = async ({
    title,
    description,
    start,
    end,
    location,
    timezone,
    participants,
    ownerRelays
  }: {
    title: string;
    description: string;
    start: number;
    end: number;
    location?: string;
    timezone: string;
    participants: string[];
    ownerRelays: { url: string; read: boolean; write: boolean }[];
  }) => {
    if (!user?.signer) {
      throw new Error('User not authenticated');
    }

    // Create the private event tags
    const tags = [
      ['d', `private-booking-${Date.now()}`],
      ['title', title],
      ['start', start.toString()],
      ['end', end.toString()],
      ['start_tzid', timezone],
    ];

    if (location) {
      tags.push(['location', location]);
    }

    // Add participant tags
    participants.forEach(pubkey => {
      tags.push(['p', pubkey, '', 'participant']);
    });

    console.log('🔨 Creating rumor with tags:', tags);

    // Create the unsigned calendar event (rumor)
    const { createRumor, createGiftWrapsForRecipients, extractParticipants } = await import('@/utils/nip59');
    
    const rumor = await createRumor({
      kind: 31923,
      content: description,
      tags,
      created_at: Math.floor(Date.now() / 1000)
    }, user.signer);

    console.log('📝 Created booking rumor:', rumor.id);

    // Extract all participants (including creator)
    const allParticipants = extractParticipants(rumor);
    console.log('👥 All participants (including creator):', allParticipants);

    // Create gift wraps for all participants
    console.log('🎁 Creating gift wraps for participants...');
    const giftWraps = await createGiftWrapsForRecipients(
      rumor,
      user.signer,
      allParticipants
    );

    console.log('📦 Created gift wraps:', giftWraps.length, 'wraps');

    // Broadcast to owner's write relays (for calendar owner)
    const ownerWriteRelays = ownerRelays.filter(r => r.write).map(r => r.url);
    console.log('📡 Broadcasting to owner write relays:', ownerWriteRelays);
    
    // Broadcast to our own relays as well  
    const { getWriteRelays: _getWriteRelays } = await import('@/utils/relay-preferences');
    
    // Get our write relays from preferences hook (we'll use current config relays as fallback)
    const ourWriteRelays = (template as { config?: { relayUrls?: string[] } }).config?.relayUrls || [
      'wss://relay.damus.io',
      'wss://nos.lol'
    ];
    
    // Combine all relay URLs and remove duplicates
    const allRelayUrls = [...new Set([...ownerWriteRelays, ...ourWriteRelays])];
    console.log('📡 All relay URLs for broadcasting:', allRelayUrls);

    // Publish each gift wrap to all relays
    const publishPromises: Promise<void>[] = [];
    
    for (const giftWrap of giftWraps) {
      try {
        console.log('🎁 Publishing gift wrap to all relays:', {
          id: giftWrap.id,
          kind: giftWrap.kind,
          recipientPubkey: giftWrap.tags.find(t => t[0] === 'p')?.[1]
        });
        
        // Use nostr.event which will broadcast to all configured relays
        const publishPromise = nostr.event(giftWrap);
        publishPromises.push(publishPromise);
        
        console.log(`✅ Scheduled gift wrap for broadcasting`);
      } catch (error) {
        console.error('❌ Failed to schedule gift wrap:', error);
      }
    }
    
    // Wait for all publishes to complete
    const results = await Promise.allSettled(publishPromises);
    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;
    
    console.log(`📊 Broadcast results: ${successful} successful, ${failed} failed`);
    
    if (successful === 0) {
      throw new Error('Failed to broadcast booking to any relays');
    }

    return rumor;
  };


  const _generateId = () => {
    return Math.random().toString(36).substring(2, 10);
  };

  const isDateAvailable = (date: Date): boolean => {
    if (!template) {
      return false;
    }
    
    const dayOfWeek = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'][date.getDay()];
    const hasAvailability = (template.availability[dayOfWeek] || []).length > 0;
    
    // Check max advance
    if (template.maxAdvance) {
      const now = new Date();
      let maxDate: Date;
      
      if (template.maxAdvanceBusiness) {
        // Count business days only
        const businessDays = Math.floor(template.maxAdvance / (24 * 60));
        maxDate = new Date(now);
        let addedDays = 0;
        while (addedDays < businessDays) {
          maxDate = addDays(maxDate, 1);
          // Skip weekends (Saturday = 6, Sunday = 0)
          if (maxDate.getDay() !== 0 && maxDate.getDay() !== 6) {
            addedDays++;
          }
        }
      } else {
        // Calendar days
        const totalDays = template.maxAdvance / (24 * 60);
        maxDate = addDays(now, totalDays);
      }
      
      if (date > maxDate) {
        return false;
      }
    }
    
    return hasAvailability;
  };

  if (step === 'loading') {
    return (
      <div className="container mx-auto p-4 max-w-4xl">
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-96 mt-2" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Skeleton className="h-64 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === 'error') {
    return (
      <div className="container mx-auto p-4 max-w-4xl">
        <Card>
          <CardHeader>
            <CardTitle>Booking Error</CardTitle>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
            <div className="mt-4">
              <Button onClick={() => navigate('/')}>
                Go to Home
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === 'success') {
    return (
      <div className="container mx-auto p-4 max-w-4xl">
        <Card>
          <CardHeader>
            <CardTitle>Booking Request Sent!</CardTitle>
            <CardDescription>
              Your booking request has been sent to the organizer
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Alert>
                <AlertDescription>
                  You will receive a confirmation once the organizer reviews your request.
                </AlertDescription>
              </Alert>
              
              <div className="space-y-2">
                <h3 className="font-semibold">Booking Details:</h3>
                <div className="text-sm text-muted-foreground space-y-1">
                  <p><strong>Event:</strong> {template?.title}</p>
                  <p><strong>Date:</strong> {selectedSlot && format(selectedSlot.start, 'EEEE, MMMM d, yyyy')}</p>
                  <p><strong>Time:</strong> {selectedSlot && `${format(selectedSlot.start, 'h:mm a')} - ${format(selectedSlot.end, 'h:mm a')}`}</p>
                  {template?.location && <p><strong>Location:</strong> {template.location}</p>}
                </div>
              </div>

              <Button onClick={() => navigate('/')}>
                Done
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5" />
            {template?.title || 'Book a Time'}
          </CardTitle>
          {template?.description && (
            <CardDescription>{template.description}</CardDescription>
          )}
        </CardHeader>
        <CardContent>
          {step === 'selecting' && (
            <div className="grid md:grid-cols-2 gap-6">
              {/* Calendar */}
              <div className="space-y-4">
                <Label>Select a Date</Label>
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  disabled={(date) => !isDateAvailable(date) || date < new Date()}
                  className="rounded-md border"
                />
                
                {template && (
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      <span>{template.duration} minute session</span>
                    </div>
                    {template.location && (
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        <span>{template.location}</span>
                      </div>
                    )}
                    {template.amount && template.amount > 0 && (
                      <div className="flex items-center gap-2">
                        <Zap className="h-4 w-4" />
                        <span>{template.amount} sats</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Time slots */}
              <div className="space-y-4">
                <Label>Available Times</Label>
                {selectedDate ? (
                  availableSlots.length > 0 ? (
                    <ScrollArea className="h-[400px] border rounded-md p-4">
                      <div className="space-y-2">
                        {availableSlots.map((slot, index) => (
                          <Button
                            key={index}
                            variant={selectedSlot === slot ? "default" : "outline"}
                            className="w-full justify-start"
                            disabled={!slot.available}
                            onClick={() => setSelectedSlot(slot)}
                          >
                            {format(slot.start, 'h:mm a')} - {format(slot.end, 'h:mm a')}
                            {!slot.available && (
                              <Badge variant="secondary" className="ml-auto">
                                Unavailable
                              </Badge>
                            )}
                          </Button>
                        ))}
                      </div>
                    </ScrollArea>
                  ) : (
                    <div className="border rounded-md p-8 text-center text-muted-foreground">
                      No available times on this date
                    </div>
                  )
                ) : (
                  <div className="border rounded-md p-8 text-center text-muted-foreground">
                    Select a date to see available times
                  </div>
                )}

                {selectedSlot && (
                  <Button 
                    className="w-full" 
                    onClick={() => setStep('booking')}
                  >
                    Continue
                  </Button>
                )}
              </div>
            </div>
          )}

          {step === 'booking' && (
            <div className="space-y-6">
              <div className="space-y-2">
                <h3 className="font-semibold">Selected Time</h3>
                <div className="text-sm text-muted-foreground">
                  <p>{selectedSlot && format(selectedSlot.start, 'EEEE, MMMM d, yyyy')}</p>
                  <p>{selectedSlot && `${format(selectedSlot.start, 'h:mm a')} - ${format(selectedSlot.end, 'h:mm a')}`}</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Your Name *</Label>
                  <Input
                    id="name"
                    value={participantName}
                    onChange={(e) => setParticipantName(e.target.value)}
                    placeholder="Enter your name"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email (optional)</Label>
                  <Input
                    id="email"
                    type="email"
                    value={participantEmail}
                    onChange={(e) => setParticipantEmail(e.target.value)}
                    placeholder="your@email.com"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="note">Message (optional)</Label>
                  <Textarea
                    id="note"
                    value={bookingNote}
                    onChange={(e) => setBookingNote(e.target.value)}
                    placeholder="Any additional information..."
                    rows={4}
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => setStep('selecting')}
                >
                  Back
                </Button>
                <Button 
                  className="flex-1"
                  onClick={handleBooking}
                  disabled={!participantName || isPublishing || !user?.signer}
                >
                  {template?.amount && template.amount > 0 
                    ? `Book & Pay ${template.amount} sats`
                    : 'Book Time'
                  }
                </Button>
              </div>
            </div>
          )}

          {step === 'confirming' && (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Creating your private booking request...</p>
              {!user?.signer && (
                <p className="text-sm text-red-500 mt-2">Please connect your Nostr account to send booking requests</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}