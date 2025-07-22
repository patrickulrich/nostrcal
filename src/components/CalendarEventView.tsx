import { useState, useEffect } from 'react';
import { Calendar, MapPin, User, Globe } from 'lucide-react';
import { format } from 'date-fns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { genUserName } from '@/lib/genUserName';
import { useAuthor } from '@/hooks/useAuthor';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useCreateRSVP, useRSVPStatus, RSVPStatus } from '@/hooks/useRSVP';
import { CommentsSection } from '@/components/comments/CommentsSection';
import { CalendarEvent } from '@/contexts/EventsContextTypes';

interface CalendarEventViewProps {
  event: CalendarEvent;
}

export function CalendarEventView({ event }: CalendarEventViewProps) {
  const author = useAuthor(event.pubkey);
  const metadata = author.data?.metadata;
  const { user } = useCurrentUser();
  const createRSVP = useCreateRSVP();
  const [rsvpStatus, setRsvpStatus] = useState<RSVPStatus | null>(null);
  const existingRSVP = useRSVPStatus(event.id);

  // Reset RSVP status when event changes and set existing RSVP
  useEffect(() => {
    setRsvpStatus(existingRSVP);
  }, [event, existingRSVP]);

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
    } else if (event.kind === 31923) {
      // Time-based event
      if (!event.start) return 'No time';
      const start = new Date(parseInt(event.start) * 1000);
      const startFormatted = format(start, 'EEEE, MMMM d, yyyy • h:mm a');
      
      if (event.end) {
        const end = new Date(parseInt(event.end) * 1000);
        // If same day, only show end time
        if (format(start, 'yyyy-MM-dd') === format(end, 'yyyy-MM-dd')) {
          return `${startFormatted} - ${format(end, 'h:mm a')}`;
        } else {
          // Different days, show full end date/time
          return `${startFormatted} - ${format(end, 'EEEE, MMMM d, yyyy • h:mm a')}`;
        }
      }
      
      return startFormatted;
    }
    
    return 'No time specified';
  };

  const getEventTypeLabel = () => {
    switch (event.kind) {
      case 31922:
        return 'Date-based Event';
      case 31923:
        return 'Time-based Event';
      case 31924:
        return 'Calendar Collection';
      case 31925:
        return 'RSVP Response';
      case 31926:
        return 'Availability Template';
      case 31927:
        return 'Availability Block';
      default:
        return 'Calendar Event';
    }
  };

  const handleRSVP = async (status: RSVPStatus) => {
    if (!event || !user) return;
    
    try {
      const eventCoordinate = `${event.kind}:${event.pubkey}:${event.dTag}`;
      
      await createRSVP.mutateAsync({
        eventId: event.id,
        eventCoordinate,
        status,
        freeText: undefined,
        eventAuthorPubkey: event.pubkey
      });

      setRsvpStatus(status);
    } catch (error) {
      console.error('Failed to create RSVP:', error);
    }
  };

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <div className="space-y-6">
        {/* Header */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <Badge variant="secondary">{getEventTypeLabel()}</Badge>
                <CardTitle className="text-2xl">
                  {event.title || 'Untitled Event'}
                </CardTitle>
                <CardDescription>
                  Created by {metadata?.name || genUserName(event.pubkey)}
                </CardDescription>
              </div>
              <Avatar className="h-12 w-12">
                {metadata?.picture && (
                  <AvatarImage src={metadata.picture} alt={metadata.name} />
                )}
                <AvatarFallback>
                  {genUserName(event.pubkey).slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </div>
          </CardHeader>
        </Card>

        {/* Event Image */}
        {event.image && (
          <Card>
            <CardContent className="p-0">
              <img 
                src={event.image} 
                alt={event.title}
                className="w-full h-64 object-cover rounded-lg"
              />
            </CardContent>
          </Card>
        )}

        {/* Event Details */}
        <Card>
          <CardHeader>
            <CardTitle>Event Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Time */}
            {(event.kind === 31922 || event.kind === 31923) && (
              <div className="flex items-start gap-3">
                <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <h4 className="font-medium">When</h4>
                  <p className="text-sm text-muted-foreground">
                    {formatEventTime()}
                  </p>
                  {event.timezone && (
                    <p className="text-xs text-muted-foreground">
                      Timezone: {event.timezone}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Location */}
            {event.location && (
              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <h4 className="font-medium">Location</h4>
                  <p className="text-sm text-muted-foreground">{event.location}</p>
                </div>
              </div>
            )}

            {/* Author */}
            <div className="flex items-start gap-3">
              <User className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <h4 className="font-medium">Organizer</h4>
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
                {metadata?.about && (
                  <p className="text-xs text-muted-foreground mt-1 max-w-md">
                    {metadata.about}
                  </p>
                )}
              </div>
            </div>

            {/* Participants */}
            {event.participants && event.participants.length > 0 && (
              <div className="flex items-start gap-3">
                <Globe className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <h4 className="font-medium">Participants ({event.participants.length})</h4>
                  <p className="text-sm text-muted-foreground">
                    This event has invited participants
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Description */}
        {event.description && (
          <Card>
            <CardHeader>
              <CardTitle>Description</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm whitespace-pre-wrap">{event.description}</p>
            </CardContent>
          </Card>
        )}

        {/* Tags */}
        {event.hashtags && event.hashtags.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Tags</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {event.hashtags.map((tag, index) => (
                  <Badge key={index} variant="secondary">
                    #{tag}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* RSVP Section */}
        {user && (event.kind === 31922 || event.kind === 31923) && (
          <Card>
            <CardHeader>
              <CardTitle>RSVP</CardTitle>
              <CardDescription>
                Let others know if you're planning to attend this event
              </CardDescription>
            </CardHeader>
            <CardContent>
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
            </CardContent>
          </Card>
        )}

        {/* Comments Section */}
        <Card>
          <CardHeader>
            <CardTitle>Discussion</CardTitle>
          </CardHeader>
          <CardContent>
            <CommentsSection 
              root={event}
              title=""
              emptyStateMessage="No comments yet"
              emptyStateSubtitle="Start the conversation about this event!"
              limit={100}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export function CalendarEventViewSkeleton() {
  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <div className="space-y-6">
        {/* Header Skeleton */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-8 w-64" />
                <Skeleton className="h-4 w-40" />
              </div>
              <Skeleton className="h-12 w-12 rounded-full" />
            </div>
          </CardHeader>
        </Card>

        {/* Event Details Skeleton */}
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3">
              <Skeleton className="h-5 w-5" />
              <div className="space-y-1">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-48" />
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Skeleton className="h-5 w-5" />
              <div className="space-y-1">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-32" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Description Skeleton */}
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-24" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}