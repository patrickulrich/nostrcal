import { forwardRef } from 'react';
import { EventRSVPBadge } from './EventRSVPBadge';
import { useIntersectionObserver } from '@/hooks/useIntersectionObserver';

interface LazyEventRSVPBadgeProps {
  eventId?: string;
  eventCoordinate?: string;
  className?: string;
}

export const LazyEventRSVPBadge = forwardRef<HTMLDivElement, LazyEventRSVPBadgeProps>(
  ({ eventId, eventCoordinate, className }, ref) => {
    const { elementRef, isIntersecting } = useIntersectionObserver({
      threshold: 0.1,
      rootMargin: '100px', // Start loading when element is 100px away from viewport
      triggerOnce: true
    });

    // Combine refs if external ref is provided
    const combinedRef = (element: HTMLDivElement | null) => {
      elementRef.current = element;
      if (ref) {
        if (typeof ref === 'function') {
          ref(element);
        } else {
          ref.current = element;
        }
      }
    };

    return (
      <div ref={combinedRef} className="absolute inset-0 pointer-events-none">
        {isIntersecting && (
          <EventRSVPBadge
            eventId={eventId}
            eventCoordinate={eventCoordinate}
            enabled={true}
            className={className}
          />
        )}
      </div>
    );
  }
);

LazyEventRSVPBadge.displayName = 'LazyEventRSVPBadge';