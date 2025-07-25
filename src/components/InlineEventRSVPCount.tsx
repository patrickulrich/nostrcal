import { Users } from 'lucide-react';
import { useEventRSVPCounts } from '@/hooks/useEventRSVPs';
import { useIntersectionObserver } from '@/hooks/useIntersectionObserver';
import { forwardRef } from 'react';

interface InlineEventRSVPCountProps {
  eventId?: string;
  eventCoordinate?: string;
  className?: string;
}

export const InlineEventRSVPCount = forwardRef<HTMLSpanElement, InlineEventRSVPCountProps>(
  ({ eventId, eventCoordinate, className }, ref) => {
    const { elementRef, isIntersecting } = useIntersectionObserver({
      threshold: 0.1,
      rootMargin: '100px', // Start loading when element is 100px away from viewport
      triggerOnce: true
    });

    const { counts, isLoading, error } = useEventRSVPCounts({ 
      eventId, 
      eventCoordinate,
      enabled: isIntersecting && !!(eventId || eventCoordinate)
    });

    // Combine refs if external ref is provided
    const combinedRef = (element: HTMLSpanElement | null) => {
      elementRef.current = element;
      if (ref) {
        if (typeof ref === 'function') {
          ref(element);
        } else {
          ref.current = element;
        }
      }
    };

    // Don't render if loading, error, or no attendees
    if (!isIntersecting || isLoading || error || counts.total === 0) {
      return <span ref={combinedRef} className={className} />;
    }

    const totalGoing = counts.accepted + counts.tentative;

    // Don't show if no one is going
    if (totalGoing === 0) {
      return <span ref={combinedRef} className={className} />;
    }

    return (
      <span 
        ref={combinedRef} 
        className={`inline-flex items-center gap-1 text-xs text-muted-foreground ${className}`}
      >
        <span>•</span>
        <Users className="h-3 w-3" />
        <span>{totalGoing}</span>
      </span>
    );
  }
);

InlineEventRSVPCount.displayName = 'InlineEventRSVPCount';