import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { ChevronDown, ChevronUp, Users, Check, X, HelpCircle } from 'lucide-react';
import { useEventRSVPCounts } from '@/hooks/useEventRSVPs';
import { useAuthor } from '@/hooks/useAuthor';
import { genUserName } from '@/lib/genUserName';
import { RSVPStatus } from '@/hooks/useRSVP';

interface EventRSVPCountProps {
  eventId?: string;
  eventCoordinate?: string;
  className?: string;
}

interface AttendeeItemProps {
  pubkey: string;
  status: RSVPStatus;
  content?: string;
}

function AttendeeItem({ pubkey, status, content }: AttendeeItemProps) {
  const author = useAuthor(pubkey);
  const metadata = author.data?.metadata;
  const displayName = metadata?.name || genUserName(pubkey);

  const statusConfig = {
    accepted: { icon: Check, color: 'text-green-600', bgColor: 'bg-green-100' },
    declined: { icon: X, color: 'text-red-600', bgColor: 'bg-red-100' },
    tentative: { icon: HelpCircle, color: 'text-yellow-600', bgColor: 'bg-yellow-100' }
  };

  const config = statusConfig[status];
  const StatusIcon = config.icon;

  if (author.isLoading) {
    return (
      <div className="flex items-center gap-3 py-2">
        <Skeleton className="h-8 w-8 rounded-full" />
        <div className="flex-1 space-y-1">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-3 w-16" />
        </div>
        <Skeleton className="h-4 w-4" />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 py-2">
      <Avatar className="h-8 w-8">
        {metadata?.picture && (
          <AvatarImage src={metadata.picture} alt={displayName} />
        )}
        <AvatarFallback className="text-xs">
          {displayName.slice(0, 2).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{displayName}</p>
        {content && (
          <p className="text-xs text-muted-foreground truncate" title={content}>
            {content}
          </p>
        )}
      </div>
      <div className={`p-1 rounded-full ${config.bgColor}`}>
        <StatusIcon className={`h-3 w-3 ${config.color}`} />
      </div>
    </div>
  );
}

export function EventRSVPCount({ eventId, eventCoordinate, className }: EventRSVPCountProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { counts, attendees, isLoading, error } = useEventRSVPCounts({ 
    eventId, 
    eventCoordinate,
    enabled: !!(eventId || eventCoordinate) 
  });

  // Don't render if no data and not loading
  if (!isLoading && counts.total === 0) {
    return null;
  }

  if (error) {
    return null;
  }

  if (isLoading) {
    return (
      <div className={`space-y-2 ${className}`}>
        <Skeleton className="h-8 w-32" />
      </div>
    );
  }

  const totalGoing = counts.accepted + counts.tentative;

  return (
    <div className={`space-y-2 ${className}`}>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" className="w-full justify-between p-0 h-auto">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">
                {totalGoing > 0 ? `${totalGoing} attending` : 'No attendees yet'}
              </span>
              {counts.total > 0 && (
                <div className="flex gap-1">
                  {counts.accepted > 0 && (
                    <Badge variant="secondary" className="text-xs bg-green-100 text-green-800">
                      {counts.accepted} going
                    </Badge>
                  )}
                  {counts.tentative > 0 && (
                    <Badge variant="secondary" className="text-xs bg-yellow-100 text-yellow-800">
                      {counts.tentative} maybe
                    </Badge>
                  )}
                  {counts.declined > 0 && (
                    <Badge variant="secondary" className="text-xs bg-red-100 text-red-800">
                      {counts.declined} not going
                    </Badge>
                  )}
                </div>
              )}
            </div>
            {counts.total > 0 && (
              <div className="flex items-center gap-1">
                <span className="text-xs text-muted-foreground">
                  {isOpen ? 'Hide' : 'Show'} attendees
                </span>
                {isOpen ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
            )}
          </Button>
        </CollapsibleTrigger>
        
        {counts.total > 0 && (
          <CollapsibleContent className="space-y-2">
            <div className="border rounded-lg p-3 bg-muted/30">
              {/* Going Section */}
              {attendees.accepted.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-medium text-green-800">
                      Going ({attendees.accepted.length})
                    </span>
                  </div>
                  <div className="space-y-1 pl-6">
                    {attendees.accepted.map((rsvp) => (
                      <AttendeeItem
                        key={rsvp.id}
                        pubkey={rsvp.pubkey}
                        status={rsvp.status}
                        content={rsvp.content}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Maybe Section */}
              {attendees.tentative.length > 0 && (
                <div className={`space-y-2 ${attendees.accepted.length > 0 ? 'mt-4 pt-4 border-t' : ''}`}>
                  <div className="flex items-center gap-2">
                    <HelpCircle className="h-4 w-4 text-yellow-600" />
                    <span className="text-sm font-medium text-yellow-800">
                      Maybe ({attendees.tentative.length})
                    </span>
                  </div>
                  <div className="space-y-1 pl-6">
                    {attendees.tentative.map((rsvp) => (
                      <AttendeeItem
                        key={rsvp.id}
                        pubkey={rsvp.pubkey}
                        status={rsvp.status}
                        content={rsvp.content}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Not Going Section */}
              {attendees.declined.length > 0 && (
                <div className={`space-y-2 ${(attendees.accepted.length > 0 || attendees.tentative.length > 0) ? 'mt-4 pt-4 border-t' : ''}`}>
                  <div className="flex items-center gap-2">
                    <X className="h-4 w-4 text-red-600" />
                    <span className="text-sm font-medium text-red-800">
                      Not Going ({attendees.declined.length})
                    </span>
                  </div>
                  <div className="space-y-1 pl-6">
                    {attendees.declined.map((rsvp) => (
                      <AttendeeItem
                        key={rsvp.id}
                        pubkey={rsvp.pubkey}
                        status={rsvp.status}
                        content={rsvp.content}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CollapsibleContent>
        )}
      </Collapsible>
    </div>
  );
}