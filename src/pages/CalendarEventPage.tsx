import { useParams } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { nip19 } from 'nostr-tools';
import NotFound from './NotFound';
import { useCalendarEventByNaddr } from '@/hooks/useCalendarEventByNaddr';
import { useCalendarEvents } from '@/hooks/useCalendarEvents';
import { usePrivateCalendarEvents } from '@/hooks/usePrivateCalendarEvents';
import { CalendarEventView, CalendarEventViewSkeleton } from '@/components/CalendarEventView';

export function CalendarEventPage() {
  const { naddr, eventId } = useParams<{ naddr?: string; eventId?: string }>();
  
  // Handle naddr-based URLs (like /events/:naddr)
  if (naddr) {
    // Validate that this is actually an naddr
    let decoded;
    try {
      decoded = nip19.decode(naddr);
    } catch {
      return <NotFound />;
    }

    if (decoded.type !== 'naddr') {
      return <NotFound />;
    }

    // Check if it's a calendar event (kinds 31922-31927, excluding 31926 which is for booking)
    const naddr_data = decoded.data;
    if (![31922, 31923, 31924, 31925, 31927].includes(naddr_data.kind)) {
      return <NotFound />;
    }

    return <CalendarEventHandlerByNaddr naddr={naddr} />;
  }
  
  // Handle eventId-based URLs (like /calendar/:eventId)  
  if (eventId) {
    return <CalendarEventHandlerById eventId={eventId} />;
  }

  return <NotFound />;
}

function CalendarEventHandlerByNaddr({ naddr }: { naddr: string }) {
  const { data: event, isLoading, error } = useCalendarEventByNaddr(naddr);


  if (isLoading) {
    return <CalendarEventViewSkeleton />;
  }

  if (error) {
    return <NotFound />;
  }

  if (!event) {
    return <NotFound />;
  }

  return <CalendarEventView event={event} />;
}

function CalendarEventHandlerById({ eventId }: { eventId: string }) {
  const { data: publicEvents = [], isLoading: isLoadingPublic } = useCalendarEvents();
  const { privateEvents = [], isLoading: isLoadingPrivate } = usePrivateCalendarEvents();
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  
  // Combine public and private events and find the one with matching ID
  const allEvents = [...publicEvents, ...privateEvents];
  const event = allEvents.find(e => e.id === eventId);

  const isLoading = isLoadingPublic || isLoadingPrivate;

  // Track when initial loading is complete - wait for either:
  // 1. Events to be loaded (public or private has content)
  // 2. Loading to finish completely
  // 3. A minimum delay to prevent flash
  useEffect(() => {
    if (!initialLoadComplete) {
      const hasEvents = publicEvents.length > 0 || privateEvents.length > 0;
      const loadingComplete = !isLoadingPublic && !isLoadingPrivate;
      
      if (hasEvents || loadingComplete) {
        // Add a small delay to prevent flash, but shorter if we found events
        const delay = hasEvents ? 50 : 300;
        const timer = setTimeout(() => setInitialLoadComplete(true), delay);
        return () => clearTimeout(timer);
      }
    }
  }, [publicEvents.length, privateEvents.length, isLoadingPublic, isLoadingPrivate, initialLoadComplete]);

  // Show loading until initial load is complete
  if (!initialLoadComplete || isLoading) {
    return <CalendarEventViewSkeleton />;
  }

  if (event) {
    return <CalendarEventView event={event} />;
  }

  return <NotFound />;
}

export default CalendarEventPage;