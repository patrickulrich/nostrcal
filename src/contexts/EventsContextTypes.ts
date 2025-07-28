import { NostrEvent } from '@nostrify/nostrify';

export interface CalendarEvent {
  id: string;
  kind: number;
  pubkey: string;
  created_at: number;
  tags: string[][];
  content: string;
  sig?: string;
  
  // Parsed calendar data
  dTag?: string;
  title?: string;
  summary?: string;
  image?: string;
  start?: string;
  end?: string;
  location?: string; // backwards compatibility
  locations?: string[]; // NIP-52 multiple locations
  geohash?: string;
  description?: string;
  timezone?: string;
  endTimezone?: string;
  hashtags?: string[];
  references?: string[];
  participants?: string[]; // backwards compatibility
  participantsWithMetadata?: Array<{pubkey: string; relayUrl?: string; role?: string}>; // NIP-52 participant metadata
  
  // RSVP-specific properties
  needsTimeFromReference?: boolean;
  referenceCoordinate?: string;
  rsvpStatus?: string;
  
  // UI properties
  color?: string;
  source?: string;
  rawEvent?: NostrEvent;
}

export interface UserCalendar {
  id: string;
  name: string;
  color: string;
  eventReferences?: string[];
}

export interface EventFilters {
  dayEvents: boolean;
  timeEvents: boolean;
  rsvpEvents: boolean;
  bookingBlocks: boolean;
  privateDayEvents: boolean;
  privateTimeEvents: boolean;
  privateRsvps: boolean;
}

export interface EventsContextValue {
  // Event arrays
  dayEvents: CalendarEvent[];
  timeEvents: CalendarEvent[];
  rsvpEvents: CalendarEvent[];
  bookingBlocks: CalendarEvent[];
  privateDayEvents: CalendarEvent[];
  privateTimeEvents: CalendarEvent[];
  privateRsvps: CalendarEvent[];
  
  // User calendars
  calendars: UserCalendar[];
  
  // Filter state
  eventFilters: EventFilters;
  visibleCalendars: Set<string>;
  
  // State setters
  setDayEvents: (events: CalendarEvent[]) => void;
  setTimeEvents: (events: CalendarEvent[]) => void;
  setRsvpEvents: (events: CalendarEvent[]) => void;
  setBookingBlocks: (events: CalendarEvent[]) => void;
  setPrivateDayEvents: (events: CalendarEvent[]) => void;
  setPrivateTimeEvents: (events: CalendarEvent[]) => void;
  setPrivateRsvps: (events: CalendarEvent[]) => void;
  setCalendars: (calendars: UserCalendar[]) => void;
  
  // Methods
  toggleEventFilter: (filterType: keyof EventFilters) => void;
  toggleCalendarVisibility: (calendarId: string) => void;
  getFilteredEvents: () => CalendarEvent[];
  addMockEvents: () => void;
}