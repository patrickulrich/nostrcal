import { useState, useEffect } from 'react';
// import { useNostr } from '@nostrify/react';
import { usePublicCalendarEvents } from '@/hooks/useCalendarEvents';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
// import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  Calendar, 
  MapPin, 
  Search,
  Tag,
  Globe,
  X,
  Video,
  ExternalLink
} from 'lucide-react';
import { format, isAfter, isBefore, isToday, addDays } from 'date-fns';
import { genUserName } from '@/lib/genUserName';
import { useAuthor } from '@/hooks/useAuthor';
import { useCreateRSVP, useRSVPStatus, RSVPStatus } from '@/hooks/useRSVP';
import { CommentsSection } from '@/components/comments/CommentsSection';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { nip19 } from 'nostr-tools';
import { Link } from 'react-router-dom';

interface CalendarEvent {
  id: string;
  kind: number;
  pubkey: string;
  created_at: number;
  tags: string[][];
  content: string;
  sig: string;
  
  // Parsed calendar data
  dTag?: string;
  title?: string;
  start?: string;
  end?: string;
  location?: string;
  description?: string;
  timezone?: string;
  participants?: string[];
  image?: string;
  hashtags?: string[];
}

interface EventCardProps {
  event: CalendarEvent;
  onClick: () => void;
  isOnlineLocation: (location: string | undefined) => boolean;
}

function EventCard({ event, onClick, isOnlineLocation }: EventCardProps) {
  const author = useAuthor(event.pubkey);
  const metadata = author.data?.metadata;

  const formatEventTime = () => {
    if (event.kind === 31922) {
      // Date-based event
      if (!event.start) return 'No date';
      const start = new Date(event.start);
      const end = event.end ? new Date(event.end) : start;
      
      if (event.start === event.end || !event.end) {
        return format(start, 'EEEE, MMMM d, yyyy');
      } else {
        return `${format(start, 'MMM d')} - ${format(end, 'MMM d, yyyy')}`;
      }
    } else {
      // Time-based event
      if (!event.start) return 'No time';
      const start = new Date(parseInt(event.start) * 1000);
      const startFormatted = format(start, 'EEE, MMM d • h:mm a');
      
      if (event.end) {
        const end = new Date(parseInt(event.end) * 1000);
        // If same day, only show end time
        if (format(start, 'yyyy-MM-dd') === format(end, 'yyyy-MM-dd')) {
          return `${startFormatted} - ${format(end, 'h:mm a')}`;
        } else {
          // Different days, show full end date/time
          return `${startFormatted} - ${format(end, 'MMM d, h:mm a')}`;
        }
      }
      
      return startFormatted;
    }
  };

  const isUpcoming = () => {
    if (!event.start) return false;
    const eventDate = event.kind === 31922 
      ? new Date(event.start) 
      : new Date(parseInt(event.start) * 1000);
    return isAfter(eventDate, new Date());
  };

  return (
    <Card 
      className="cursor-pointer hover:shadow-lg transition-shadow"
      onClick={onClick}
    >
      {event.image && (
        <div className="aspect-video relative overflow-hidden rounded-t-lg">
          <img 
            src={event.image} 
            alt={event.title}
            className="object-cover w-full h-full"
          />
        </div>
      )}
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <CardTitle className="text-lg line-clamp-2">
            {event.title || 'Untitled Event'}
          </CardTitle>
          {isUpcoming() && (
            <Badge variant="default" className="ml-2 shrink-0">
              Upcoming
            </Badge>
          )}
        </div>
        <CardDescription className="text-sm">
          {formatEventTime()}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {event.location && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {isOnlineLocation(event.location) ? (
              <Video className="h-4 w-4 shrink-0" />
            ) : (
              <MapPin className="h-4 w-4 shrink-0" />
            )}
            <span className="truncate">{event.location}</span>
          </div>
        )}
        
        <div className="flex items-center gap-2">
          <Avatar className="h-6 w-6">
            {metadata?.picture && (
              <AvatarImage src={metadata.picture} alt={metadata.name} />
            )}
            <AvatarFallback className="text-xs">
              {genUserName(event.pubkey).slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <span className="text-sm text-muted-foreground">
            {metadata?.name || genUserName(event.pubkey)}
          </span>
        </div>

        {event.hashtags && event.hashtags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {event.hashtags.slice(0, 3).map((tag, index) => (
              <Badge key={index} variant="secondary" className="text-xs">
                #{tag}
              </Badge>
            ))}
            {event.hashtags.length > 3 && (
              <Badge variant="secondary" className="text-xs">
                +{event.hashtags.length - 3}
              </Badge>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Generate naddr URL for a calendar event
function generateEventNaddr(event: CalendarEvent): string | null {
  if (!event.dTag || !event.pubkey) return null;
  
  try {
    const naddr = nip19.naddrEncode({
      identifier: event.dTag,
      pubkey: event.pubkey,
      kind: event.kind,
    });
    return `/events/${naddr}`;
  } catch (error) {
    console.error('Failed to generate naddr:', error);
    return null;
  }
}

export default function Events() {
  const { data: events, isLoading, error } = usePublicCalendarEvents();
  const { user } = useCurrentUser();
  const createRSVP = useCreateRSVP();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [timeFilter, setTimeFilter] = useState<'all' | 'today' | 'week' | 'upcoming'>('upcoming');
  const [locationFilter, setLocationFilter] = useState<'all' | 'online' | 'in-person'>('all');
  const [rsvpStatus, setRsvpStatus] = useState<RSVPStatus | null>(null);
  const existingRSVP = useRSVPStatus(selectedEvent?.id || '');

  // Helper function to determine if location is online (contains hyperlink)
  const isOnlineLocation = (location: string | undefined): boolean => {
    if (!location) return false;
    // Check if location contains URL patterns
    return /^(https?:\/\/|www\.)/.test(location.trim());
  };

  // Process events to extract hashtags and images
  const processedEvents = events?.map(event => {
    const hashtags = event.tags
      .filter(tag => tag[0] === 't')
      .map(tag => tag[1]);
    
    const image = event.tags.find(tag => tag[0] === 'image')?.[1];
    
    return {
      ...event,
      hashtags,
      image
    };
  }) || [];

  // Extract all unique tags
  const allTags = Array.from(new Set(
    processedEvents.flatMap(event => event.hashtags || [])
  )).sort();

  // Filter events
  const filteredEvents = processedEvents.filter(event => {
    // Search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      const matchesTitle = event.title?.toLowerCase().includes(search);
      const matchesDescription = event.description?.toLowerCase().includes(search);
      const matchesLocation = event.location?.toLowerCase().includes(search);
      const matchesTags = event.hashtags?.some(tag => tag.toLowerCase().includes(search));
      
      if (!matchesTitle && !matchesDescription && !matchesLocation && !matchesTags) {
        return false;
      }
    }

    // Tag filter
    if (selectedTag && !event.hashtags?.includes(selectedTag)) {
      return false;
    }

    // Location filter
    if (locationFilter !== 'all') {
      const isOnline = isOnlineLocation(event.location);
      if (locationFilter === 'online' && !isOnline) {
        return false;
      }
      if (locationFilter === 'in-person' && isOnline) {
        return false;
      }
    }

    // Time filter
    if (timeFilter !== 'all') {
      const now = new Date();
      const eventDate = event.kind === 31922 
        ? new Date(event.start || '') 
        : new Date((parseInt(event.start || '0') || 0) * 1000);
      
      switch (timeFilter) {
        case 'today':
          if (!isToday(eventDate)) return false;
          break;
        case 'week':
          if (!isAfter(eventDate, now) || !isBefore(eventDate, addDays(now, 7))) return false;
          break;
        case 'upcoming':
          if (!isAfter(eventDate, now)) return false;
          break;
      }
    }

    return true;
  });

  // Sort events (those with images first, then by date)
  const sortedEvents = [...filteredEvents].sort((a, b) => {
    // Prioritize events with images
    if (a.image && !b.image) return -1;
    if (!a.image && b.image) return 1;
    
    // Then sort by date
    const dateA = a.kind === 31922 
      ? new Date(a.start || '').getTime() 
      : (parseInt(a.start || '0') || 0) * 1000;
    const dateB = b.kind === 31922 
      ? new Date(b.start || '').getTime() 
      : (parseInt(b.start || '0') || 0) * 1000;
    
    return dateA - dateB;
  });

  // Show skeleton loading while loading
  const showSkeletonLoading = isLoading;

  const handleRSVP = async (status: RSVPStatus) => {
    if (!selectedEvent || !user) return;
    
    try {
      const eventCoordinate = `${selectedEvent.kind}:${selectedEvent.pubkey}:${selectedEvent.dTag}`;
      
      await createRSVP.mutateAsync({
        eventId: selectedEvent.id,
        eventCoordinate,
        status,
        freeText: undefined,
        eventAuthorPubkey: selectedEvent.pubkey
      });

      setRsvpStatus(status);
    } catch (error) {
      console.error('Failed to create RSVP:', error);
    }
  };

  // Reset RSVP status when event changes and set existing RSVP
  useEffect(() => {
    setRsvpStatus(existingRSVP);
  }, [selectedEvent, existingRSVP]);

  if (error) {
    return (
      <div className="container mx-auto p-4 max-w-7xl">
        <Card>
          <CardContent className="py-8">
            <div className="text-center">
              <Globe className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h2 className="text-xl font-semibold mb-2">Failed to Load Events</h2>
              <p className="text-muted-foreground">
                {error instanceof Error ? error.message : 'Unknown error'}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 max-w-7xl">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Discover Events</h1>
          <p className="text-muted-foreground mt-2">
            Browse public calendar events from the Nostr network
          </p>
        </div>

        {/* Filters */}
        <div className="space-y-4">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search events..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <div className="flex flex-col sm:flex-row gap-2">
              <Tabs value={timeFilter} onValueChange={(value) => setTimeFilter(value as 'all' | 'today' | 'week' | 'upcoming')}>
                <TabsList>
                  <TabsTrigger value="all">All</TabsTrigger>
                  <TabsTrigger value="today">Today</TabsTrigger>
                  <TabsTrigger value="week">This Week</TabsTrigger>
                  <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
                </TabsList>
              </Tabs>
              
              <Tabs value={locationFilter} onValueChange={(value) => setLocationFilter(value as 'all' | 'online' | 'in-person')}>
                <TabsList>
                  <TabsTrigger value="all">All Locations</TabsTrigger>
                  <TabsTrigger value="online">Online</TabsTrigger>
                  <TabsTrigger value="in-person">In-Person</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>

          {/* Tag filters */}
          {allTags.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm text-muted-foreground">
                <Tag className="h-4 w-4 inline mr-1" />
                Filter by tag:
              </span>
              {selectedTag && (
                <Badge 
                  variant="default" 
                  className="cursor-pointer"
                  onClick={() => setSelectedTag(null)}
                >
                  {selectedTag}
                  <X className="h-3 w-3 ml-1" />
                </Badge>
              )}
              {allTags.filter(tag => tag !== selectedTag).slice(0, 10).map(tag => (
                <Badge
                  key={tag}
                  variant="outline"
                  className="cursor-pointer hover:bg-accent"
                  onClick={() => setSelectedTag(tag)}
                >
                  {tag}
                </Badge>
              ))}
              {allTags.length > 10 && (
                <span className="text-sm text-muted-foreground">
                  +{allTags.length - 10} more
                </span>
              )}
            </div>
          )}
        </div>

        {/* Results */}
        {showSkeletonLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <Card key={i}>
                <Skeleton className="aspect-video" />
                <CardHeader>
                  <Skeleton className="h-6 w-full" />
                  <Skeleton className="h-4 w-32 mt-2" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-4 w-48" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : sortedEvents.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center">
              <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h2 className="text-xl font-semibold mb-2">No Events Found</h2>
              <p className="text-muted-foreground">
                {searchTerm || selectedTag
                  ? 'Try adjusting your filters'
                  : 'No public events are available at this time'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sortedEvents.map(event => (
              <EventCard
                key={event.id}
                event={event}
                onClick={() => setSelectedEvent(event)}
                isOnlineLocation={isOnlineLocation}
              />
            ))}
          </div>
        )}

        {/* Event Detail Modal */}
        <Dialog open={!!selectedEvent} onOpenChange={() => setSelectedEvent(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            {selectedEvent && (
              <>
                <DialogHeader>
                  <DialogTitle>
                    {generateEventNaddr(selectedEvent) ? (
                      <Link 
                        to={generateEventNaddr(selectedEvent)!} 
                        className="inline-flex items-center gap-2 hover:underline focus:outline-none focus:underline"
                        title="View full event page"
                      >
                        {selectedEvent.title || 'Untitled Event'}
                        <ExternalLink className="h-4 w-4" />
                      </Link>
                    ) : (
                      selectedEvent.title || 'Untitled Event'
                    )}
                  </DialogTitle>
                  <DialogDescription>
                    Event details and information
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4 mt-4">
                  {selectedEvent.image && (
                    <img 
                      src={selectedEvent.image} 
                      alt={selectedEvent.title}
                      className="w-full rounded-lg"
                    />
                  )}
                  
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">
                        {selectedEvent.kind === 31922 ? (
                          // Date-based event
                          selectedEvent.start && selectedEvent.end && selectedEvent.start !== selectedEvent.end ? (
                            `${format(new Date(selectedEvent.start), 'MMMM d')} - ${format(new Date(selectedEvent.end), 'MMMM d, yyyy')}`
                          ) : (
                            selectedEvent.start ? format(new Date(selectedEvent.start), 'EEEE, MMMM d, yyyy') : 'No date'
                          )
                        ) : (
                          // Time-based event
                          selectedEvent.start ? (
                            <>
                              {(() => {
                                const startDate = new Date(parseInt(selectedEvent.start) * 1000);
                                const endDate = selectedEvent.end ? new Date(parseInt(selectedEvent.end) * 1000) : null;
                                const isSameDay = endDate && format(startDate, 'yyyy-MM-dd') === format(endDate, 'yyyy-MM-dd');
                                
                                if (!endDate) {
                                  // No end time
                                  return (
                                    <>
                                      {format(startDate, 'EEEE, MMMM d, yyyy')}
                                      <br />
                                      <span className="font-medium">
                                        {format(startDate, 'h:mm a')}
                                      </span>
                                    </>
                                  );
                                } else if (isSameDay) {
                                  // Same day event
                                  return (
                                    <>
                                      {format(startDate, 'EEEE, MMMM d, yyyy')}
                                      <br />
                                      <span className="font-medium">
                                        {format(startDate, 'h:mm a')} - {format(endDate, 'h:mm a')}
                                      </span>
                                    </>
                                  );
                                } else {
                                  // Multi-day event
                                  return (
                                    <>
                                      <div className="font-medium">
                                        {format(startDate, 'EEEE, MMMM d, yyyy • h:mm a')}
                                      </div>
                                      <div className="text-muted-foreground">to</div>
                                      <div className="font-medium">
                                        {format(endDate, 'EEEE, MMMM d, yyyy • h:mm a')}
                                      </div>
                                    </>
                                  );
                                }
                              })()}
                            </>
                          ) : 'No time'
                        )}
                      </span>
                    </div>

                    {selectedEvent.location && (
                      <div className="flex items-center gap-2">
                        {isOnlineLocation(selectedEvent.location) ? (
                          <Video className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                        )}
                        <span className="text-sm">{selectedEvent.location}</span>
                      </div>
                    )}

                    {selectedEvent.description && (
                      <div className="pt-2 border-t">
                        <p className="text-sm whitespace-pre-wrap">{selectedEvent.description}</p>
                      </div>
                    )}

                    {selectedEvent.hashtags && selectedEvent.hashtags.length > 0 && (
                      <div className="flex flex-wrap gap-2 pt-2">
                        {selectedEvent.hashtags.map((tag, index) => (
                          <Badge key={index} variant="secondary">
                            #{tag}
                          </Badge>
                        ))}
                      </div>
                    )}

                    {/* RSVP Section */}
                    {user && (selectedEvent.kind === 31922 || selectedEvent.kind === 31923) && (
                      <div className="pt-4 border-t">
                        <h4 className="text-sm font-medium mb-3">RSVP to this event</h4>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant={rsvpStatus === 'accepted' ? 'default' : 'outline'}
                            onClick={() => handleRSVP('accepted')}
                            disabled={createRSVP.isPending}
                            className="flex-1"
                          >
                            {rsvpStatus === 'accepted' ? '✓ Going' : 'Going'}
                          </Button>
                          <Button
                            size="sm"
                            variant={rsvpStatus === 'tentative' ? 'default' : 'outline'}
                            onClick={() => handleRSVP('tentative')}
                            disabled={createRSVP.isPending}
                            className="flex-1"
                          >
                            {rsvpStatus === 'tentative' ? '? Maybe' : 'Maybe'}
                          </Button>
                          <Button
                            size="sm"
                            variant={rsvpStatus === 'declined' ? 'default' : 'outline'}
                            onClick={() => handleRSVP('declined')}
                            disabled={createRSVP.isPending}
                            className="flex-1"
                          >
                            {rsvpStatus === 'declined' ? '✗ Not Going' : 'Not Going'}
                          </Button>
                        </div>
                        {createRSVP.isPending && (
                          <p className="text-sm text-muted-foreground mt-2">
                            Creating RSVP...
                          </p>
                        )}
                      </div>
                    )}

                    {/* Comments Section */}
                    <div className="pt-4 border-t">
                      <CommentsSection 
                        root={selectedEvent}
                        title="Discussion"
                        emptyStateMessage="No comments yet"
                        emptyStateSubtitle="Start the conversation about this event!"
                        limit={100}
                      />
                    </div>
                  </div>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}