import { useState, useEffect, ReactNode } from 'react';
import { CalendarEvent, UserCalendar, EventFilters, EventsContextValue } from './EventsContextTypes';
import { EventsContext } from './EventsContextInstance';
import { useAcceptedRSVPEvents } from '@/hooks/useRSVPEventDetails';

interface EventsProviderProps {
  children: ReactNode;
}

export function EventsProvider({ children }: EventsProviderProps) {
  // Event state
  const [dayEvents, setDayEvents] = useState<CalendarEvent[]>([]);
  const [timeEvents, setTimeEvents] = useState<CalendarEvent[]>([]);
  const [rsvpEvents, setRsvpEvents] = useState<CalendarEvent[]>([]);
  const [bookingBlocks, setBookingBlocks] = useState<CalendarEvent[]>([]);
  const [privateDayEvents, setPrivateDayEvents] = useState<CalendarEvent[]>([]);
  const [privateTimeEvents, setPrivateTimeEvents] = useState<CalendarEvent[]>([]);
  const [privateRsvps, setPrivateRsvps] = useState<CalendarEvent[]>([]);
  
  // Get accepted RSVP events
  const { data: acceptedRSVPEvents } = useAcceptedRSVPEvents();
  
  // Calendar state
  const [calendars, setCalendars] = useState<UserCalendar[]>([]);
  
  // Filter state
  const [eventFilters, setEventFilters] = useState<EventFilters>({
    dayEvents: true,
    timeEvents: true,
    rsvpEvents: true,
    bookingBlocks: false,
    privateDayEvents: true,
    privateTimeEvents: true,
    privateRsvps: true,
  });
  
  const [visibleCalendars, setVisibleCalendars] = useState<Set<string>>(new Set());

  // Methods
  const toggleEventFilter = (filterType: keyof EventFilters) => {
    setEventFilters(prev => ({
      ...prev,
      [filterType]: !prev[filterType]
    }));
  };

  const toggleCalendarVisibility = (calendarId: string) => {
    setVisibleCalendars(prev => {
      const newSet = new Set(prev);
      if (newSet.has(calendarId)) {
        newSet.delete(calendarId);
      } else {
        newSet.add(calendarId);
      }
      return newSet;
    });
  };

  const isEventReferencedByVisibleCalendar = (event: CalendarEvent) => {
    if (!event.dTag) return false;
    
    const eventCoordinate = `${event.kind}:${event.pubkey}:${event.dTag}`;
    
    return calendars.some(calendar => 
      visibleCalendars.has(calendar.id) && 
      calendar.eventReferences?.includes(eventCoordinate)
    );
  };

  // Convert accepted RSVP events to calendar events
  const acceptedRSVPCalendarEvents: CalendarEvent[] = acceptedRSVPEvents?.map(rsvp => {
    if (!rsvp.eventDetails) return null;
    
    return {
      id: rsvp.eventDetails.id,
      kind: rsvp.eventDetails.kind,
      pubkey: rsvp.originalEvent?.pubkey || '',
      created_at: rsvp.originalEvent?.created_at || Math.floor(Date.now() / 1000),
      tags: rsvp.originalEvent?.tags || [],
      content: rsvp.eventDetails.description || '',
      sig: rsvp.originalEvent?.sig || '',
      dTag: rsvp.eventDetails.dTag,
      title: rsvp.eventDetails.title,
      start: rsvp.eventDetails.start,
      end: rsvp.eventDetails.end,
      location: rsvp.eventDetails.location,
      description: rsvp.eventDetails.description,
      timezone: rsvp.eventDetails.timezone,
      participants: rsvp.eventDetails.participants,
      source: 'accepted-rsvp',
      rawEvent: rsvp.originalEvent
    } as CalendarEvent;
  }).filter(Boolean) as CalendarEvent[] || [];

  const getFilteredEvents = () => {
    const filteredEvents: CalendarEvent[] = [];
    const addedEventIds = new Set<string>();


    // Helper to add event with deduplication
    const addEvent = (event: CalendarEvent, defaultColor: string, source: string) => {
      // Create a unique identifier for events that might not have an id
      const eventKey = event.id || `${event.kind}:${event.pubkey}:${event.dTag}:${event.created_at}`;
      if (addedEventIds.has(eventKey)) return;

      const isReferencedByVisibleCalendar = isEventReferencedByVisibleCalendar(event);

      if (isReferencedByVisibleCalendar) {
        // Use calendar color if referenced by visible calendar
        const eventCoordinate = `${event.kind}:${event.pubkey}:${event.dTag}`;
        const referencingCalendar = calendars.find(calendar => 
          visibleCalendars.has(calendar.id) && 
          calendar.eventReferences?.includes(eventCoordinate)
        );

        if (referencingCalendar) {
          filteredEvents.push({
            ...event,
            color: referencingCalendar.color,
            source: 'calendar'
          });
        }
      } else {
        // Use default color for standalone events
        filteredEvents.push({
          ...event,
          color: defaultColor,
          source: source
        });
      }

      addedEventIds.add(eventKey);
    };

    // Add events from each source based on filters
    if (eventFilters.dayEvents) {
      dayEvents.forEach(event => addEvent(event, '#4285f4', 'dayEvents'));
    }

    if (eventFilters.timeEvents) {
      timeEvents.forEach(event => addEvent(event, '#34a853', 'timeEvents'));
    }

    if (eventFilters.rsvpEvents) {
      rsvpEvents.forEach(event => addEvent(event, '#fbbc04', 'rsvpEvents'));
    }

    if (eventFilters.bookingBlocks) {
      bookingBlocks.forEach(event => addEvent(event, '#ea4335', 'bookingBlocks'));
    }

    if (eventFilters.privateDayEvents) {
      privateDayEvents.forEach(event => addEvent(event, '#9c27b0', 'privateDayEvents'));
    }

    if (eventFilters.privateTimeEvents) {
      privateTimeEvents.forEach(event => addEvent(event, '#673ab7', 'privateTimeEvents'));
    }

    if (eventFilters.privateRsvps) {
      privateRsvps.forEach(event => addEvent(event, '#3f51b5', 'privateRsvps'));
    }

    // Add accepted RSVP events (always shown when rsvpEvents filter is enabled)
    if (eventFilters.rsvpEvents) {
      acceptedRSVPCalendarEvents.forEach(event => addEvent(event, '#ff9800', 'accepted-rsvp'));
    }


    return filteredEvents;
  };

  const addMockEvents = () => {
    // Add some mock events for testing
    const mockTimeEvents: CalendarEvent[] = [
      {
        id: 'mock-1',
        kind: 31923,
        pubkey: 'mock-pubkey',
        created_at: Math.floor(Date.now() / 1000),
        tags: [
          ['d', 'mock-1'],
          ['title', 'Team Meeting'],
          ['start', Math.floor(Date.now() / 1000 + 3600).toString()],
          ['end', Math.floor(Date.now() / 1000 + 5400).toString()],
          ['location', 'Conference Room A']
        ],
        content: 'Weekly team sync meeting',
        sig: 'mock-sig',
        dTag: 'mock-1',
        title: 'Team Meeting',
        start: Math.floor(Date.now() / 1000 + 3600).toString(),
        end: Math.floor(Date.now() / 1000 + 5400).toString(),
        location: 'Conference Room A',
        description: 'Weekly team sync meeting',
        color: '#34a853'
      }
    ];

    const mockDayEvents: CalendarEvent[] = [
      {
        id: 'mock-2',
        kind: 31922,
        pubkey: 'mock-pubkey',
        created_at: Math.floor(Date.now() / 1000),
        tags: [
          ['d', 'mock-2'],
          ['title', 'Conference Day'],
          ['start', new Date().toISOString().split('T')[0]],
          ['end', new Date(Date.now() + 86400000).toISOString().split('T')[0]]
        ],
        content: 'Annual company conference',
        sig: 'mock-sig',
        dTag: 'mock-2',
        title: 'Conference Day',
        start: new Date().toISOString().split('T')[0],
        end: new Date(Date.now() + 86400000).toISOString().split('T')[0],
        description: 'Annual company conference',
        color: '#4285f4'
      }
    ];

    setTimeEvents(mockTimeEvents);
    setDayEvents(mockDayEvents);
  };

  // Initialize visible calendars when calendars change
  useEffect(() => {
    const allCalendarIds = new Set(calendars.map(cal => cal.id));
    setVisibleCalendars(allCalendarIds);
  }, [calendars]);

  const value: EventsContextValue = {
    dayEvents,
    timeEvents,
    rsvpEvents,
    bookingBlocks,
    privateDayEvents,
    privateTimeEvents,
    privateRsvps,
    calendars,
    eventFilters,
    visibleCalendars,
    setDayEvents,
    setTimeEvents,
    setRsvpEvents,
    setBookingBlocks,
    setPrivateDayEvents,
    setPrivateTimeEvents,
    setPrivateRsvps,
    setCalendars,
    toggleEventFilter,
    toggleCalendarVisibility,
    getFilteredEvents,
    addMockEvents,
  };

  return (
    <EventsContext.Provider value={value}>
      {children}
    </EventsContext.Provider>
  );
}