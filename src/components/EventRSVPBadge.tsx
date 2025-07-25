import { Badge } from '@/components/ui/badge';
import { Users } from 'lucide-react';
import { useEventRSVPCounts } from '@/hooks/useEventRSVPs';

interface EventRSVPBadgeProps {
  eventId?: string;
  eventCoordinate?: string;
  enabled?: boolean;
  className?: string;
}

export function EventRSVPBadge({ eventId, eventCoordinate, enabled = true, className }: EventRSVPBadgeProps) {
  const { counts, isLoading, error } = useEventRSVPCounts({ 
    eventId, 
    eventCoordinate,
    enabled: enabled && !!(eventId || eventCoordinate)
  });

  // Don't render if loading, error, or no attendees
  if (isLoading || error || counts.total === 0) {
    return null;
  }

  const totalGoing = counts.accepted + counts.tentative;

  // Don't show if no one is going
  if (totalGoing === 0) {
    return null;
  }

  return (
    <Badge 
      variant="secondary" 
      className={`absolute bottom-2 right-2 bg-background/90 backdrop-blur-sm border text-xs flex items-center gap-1 shadow-sm ${className}`}
    >
      <Users className="h-3 w-3" />
      {totalGoing}
    </Badge>
  );
}