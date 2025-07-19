import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNostr } from '@nostrify/react';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { usePrivateCalendarEvents } from '@/hooks/usePrivateCalendarEvents';
import { NostrEvent } from '@nostrify/nostrify';
import { Rumor } from '@/utils/nip59';

// Calendar event types based on NIP-52
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
  summary?: string;
  image?: string;
  start?: string;
  end?: string;
  location?: string;
  geohash?: string;
  description?: string;
  timezone?: string;
  endTimezone?: string;
  hashtags?: string[];
  references?: string[];
  participants?: string[];
  
  // UI properties
  color?: string;
  source?: string;
  rawEvent?: NostrEvent;
}

// Transform NostrEvent or Rumor to CalendarEvent
function transformEventForCalendar(event: NostrEvent | Rumor): CalendarEvent {
  const dTag = event.tags.find(tag => tag[0] === 'd')?.[1];
  const title = event.tags.find(tag => tag[0] === 'title')?.[1];
  const summary = event.tags.find(tag => tag[0] === 'summary')?.[1];
  const image = event.tags.find(tag => tag[0] === 'image')?.[1];
  const start = event.tags.find(tag => tag[0] === 'start')?.[1];
  const end = event.tags.find(tag => tag[0] === 'end')?.[1];
  const location = event.tags.find(tag => tag[0] === 'location')?.[1];
  const geohash = event.tags.find(tag => tag[0] === 'g')?.[1];
  const timezone = event.tags.find(tag => tag[0] === 'start_tzid')?.[1] || 
                   event.tags.find(tag => tag[0] === 'timezone')?.[1];
  const endTimezone = event.tags.find(tag => tag[0] === 'end_tzid')?.[1];
  
  const participants = event.tags
    .filter(tag => tag[0] === 'p')
    .map(tag => tag[1]);
    
  const hashtags = event.tags
    .filter(tag => tag[0] === 't')
    .map(tag => tag[1]);
    
  const references = event.tags
    .filter(tag => tag[0] === 'r')
    .map(tag => tag[1]);

  return {
    id: event.id,
    kind: event.kind,
    pubkey: event.pubkey,
    created_at: event.created_at,
    tags: event.tags,
    content: event.content,
    sig: 'sig' in event ? event.sig : '',
    dTag,
    title,
    summary,
    image,
    start,
    end,
    location,
    geohash,
    description: event.content,
    timezone,
    endTimezone,
    hashtags,
    references,
    participants,
    rawEvent: 'sig' in event ? event : undefined
  };
}

// Validate calendar event according to NIP-52
function validateCalendarEvent(event: NostrEvent | Rumor): boolean {
  // Check if it's a calendar event kind
  if (![31922, 31923, 31924, 31925, 31926, 31927].includes(event.kind)) return false;

  // Check for required tags according to NIP-52
  const d = event.tags.find(([name]) => name === 'd')?.[1];
  const title = event.tags.find(([name]) => name === 'title')?.[1];
  
  // All calendar events require 'd' tag
  if (!d) return false;

  // Date-based events (31922) require title and start
  if (event.kind === 31922) {
    const start = event.tags.find(([name]) => name === 'start')?.[1];
    if (!title || !start) return false;
    
    // start tag should be in YYYY-MM-DD format for date-based events
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(start)) return false;
  }

  // Time-based events (31923) require title and start
  if (event.kind === 31923) {
    const start = event.tags.find(([name]) => name === 'start')?.[1];
    if (!title || !start) return false;
    
    // start tag should be a unix timestamp for time-based events
    // but some private events might have ISO date strings
    const timestamp = parseInt(start);
    if (!isNaN(timestamp) && timestamp > 0) {
      // Valid Unix timestamp
      return true;
    } else if (typeof start === 'string' && start.includes('T')) {
      // Might be ISO date string, try to parse it
      const date = new Date(start);
      return !isNaN(date.getTime());
    }
    return false;
  }

  // Calendar collections (31924) require title
  if (event.kind === 31924) {
    if (!title) return false;
  }

  // RSVPs (31925) require status
  if (event.kind === 31925) {
    const status = event.tags.find(([name]) => name === 'status')?.[1];
    if (!status || !['accepted', 'declined', 'tentative'].includes(status)) return false;
  }

  // Availability templates (31926) require title
  if (event.kind === 31926) {
    if (!title) return false;
  }

  // Availability blocks (31927) require start and end
  if (event.kind === 31927) {
    const start = event.tags.find(([name]) => name === 'start')?.[1];
    const end = event.tags.find(([name]) => name === 'end')?.[1];
    if (!start || !end) return false;
    
    const startTime = parseInt(start);
    const endTime = parseInt(end);
    if (isNaN(startTime) || isNaN(endTime) || startTime >= endTime) return false;
  }

  return true;
}

export function useCalendarEvents() {
  const { nostr } = useNostr();
  const { user } = useCurrentUser();
  const { privateEvents } = usePrivateCalendarEvents();
  const [publicEvents, setPublicEvents] = useState<NostrEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Stream public calendar events in real-time
  useEffect(() => {
    if (!user?.pubkey || !nostr) {
      setPublicEvents([]);
      return;
    }


    let isMounted = true;
    const controller = new AbortController();

    const startStreaming = async () => {
      try {
        setIsLoading(true);
        setPublicEvents([]);

        const eventIds = new Set<string>();

        // Create multiple subscriptions for different event types
        const filters = [
          // Events authored by the user
          {
            kinds: [31922, 31923, 31924, 31925, 31926, 31927],
            authors: [user.pubkey],
            limit: 100
          },
          // Events where the user is a participant  
          {
            kinds: [31922, 31923, 31924, 31925, 31926, 31927],
            "#p": [user.pubkey],
            limit: 100
          }
        ];

  
        // Process multiple subscriptions concurrently
        const streamPromises = filters.map(async (filter, _index) => {
          try {
              
            const subscription = nostr.req([filter], { signal: controller.signal });
            let eventCount = 0;
            
            // ✅ CORRECT: Handle relay messages properly  
            for await (const msg of subscription) {
              if (!isMounted) {
                break;
              }
              
              // Handle different message types
              if (msg[0] === 'EVENT') {
                const event = msg[2]; // ✅ Extract actual event from msg[2]
                eventCount++;
                
                
                // Skip duplicates and validate
                if (eventIds.has(event.id)) {
                  continue;
                }
                
                if (!validateCalendarEvent(event)) {
                  continue;
                }
                
                eventIds.add(event.id);
                
                // Add event immediately for real-time streaming
                setPublicEvents(prev => {
                  const updated = [...prev, event];
                  return updated.sort((a, b) => b.created_at - a.created_at);
                });
                
                // Mark as no longer loading after first event
                if (eventCount === 1) {
                  setIsLoading(false);
                }
                
              } else if (msg[0] === 'EOSE') {
                if (isMounted) {
                  setIsLoading(false); // Always clear loading on EOSE, even if no events
                }
              } else if (msg[0] === 'CLOSED') {
                break;
              }
            }
            
          } catch (error) {
            if (!controller.signal.aborted) {
              console.error('Calendar events stream error:', error);
            }
          }
        });

        // Don't wait for streams to complete - they should run indefinitely!
          
        // Set a timeout to clear loading state if no events arrive
        setTimeout(() => {
          if (isMounted) {
            setIsLoading(false);
          }
        }, 5000); // 5 second timeout
        
        // Just start all streams in parallel - they'll update state as events arrive
        streamPromises.forEach(promise => {
          promise.catch(_error => {
            if (!controller.signal.aborted) {
              // Handle error silently for now
            }
          });
        });
      } catch (error) {
        if (!controller.signal.aborted) {
          console.error('Calendar events streaming error:', error);
        }
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    startStreaming();

    // Cleanup
    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [user?.pubkey, nostr]);

  // Combine public and private events
  const allEvents = useMemo(() => {

    const validPublicEvents = publicEvents.filter(validateCalendarEvent);
    const validPrivateEvents = privateEvents.filter(validateCalendarEvent);


    const combined = [
      ...validPublicEvents.map(transformEventForCalendar),
      ...validPrivateEvents.map(event => ({
        ...transformEventForCalendar(event),
        source: 'private'
      }))
    ];


    return combined.sort((a, b) => b.created_at - a.created_at);
  }, [publicEvents, privateEvents]);

  return {
    data: allEvents,
    isLoading,
    error: null,
    isError: false,
    isSuccess: !isLoading
  };
}

export function usePublicCalendarEvents() {
  const { nostr } = useNostr();

  return useQuery({
    queryKey: ['public-calendar-events'],
    queryFn: async (c) => {
      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(5000)]);
      
      const events = await nostr.query([
        {
          kinds: [31922, 31923], // Only public date and time events
          limit: 50
        }
      ], { signal });

      // Filter events through validator
      const validEvents = events.filter(validateCalendarEvent);

      // Transform events for calendar display
      return validEvents.map(transformEventForCalendar);
    },
    staleTime: 60 * 1000, // 1 minute
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}

export function useAvailabilityTemplate(naddr: string) {
  const { nostr } = useNostr();

  return useQuery({
    queryKey: ['availability-template', naddr],
    queryFn: async (c) => {
      if (!naddr) return null;

      // Parse naddr to get the coordinate info
      // This is a simplified version - in reality you'd use nip19.decode
      const parts = naddr.split(':');
      if (parts.length !== 3) return null;

      const [kind, pubkey, dTag] = parts;
      if (kind !== '31926') return null;

      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(5000)]);
      
      const events = await nostr.query([
        {
          kinds: [31926],
          authors: [pubkey],
          '#d': [dTag],
          limit: 1
        }
      ], { signal });

      if (events.length === 0) return null;

      const event = events[0];
      if (!validateCalendarEvent(event)) return null;

      return transformEventForCalendar(event);
    },
    enabled: !!naddr,
    staleTime: 60 * 1000, // 1 minute
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}

export function useUserCalendars() {
  const { nostr } = useNostr();
  const { user } = useCurrentUser();

  return useQuery({
    queryKey: ['user-calendars', user?.pubkey],
    queryFn: async (c) => {
      if (!user?.pubkey) return [];

      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(5000)]);
      
      const events = await nostr.query([
        {
          kinds: [31924], // Calendar collections
          authors: [user.pubkey],
          limit: 20
        }
      ], { signal });

      const validEvents = events.filter(validateCalendarEvent);

      return validEvents.map(event => {
        const dTag = event.tags.find(tag => tag[0] === 'd')?.[1];
        const title = event.tags.find(tag => tag[0] === 'title')?.[1];
        const eventReferences = event.tags
          .filter(tag => tag[0] === 'a')
          .map(tag => tag[1]);

        return {
          id: dTag || event.id,
          name: title || 'Untitled Calendar',
          color: '#4285f4', // Default color
          eventReferences,
          rawEvent: event
        };
      });
    },
    enabled: !!user?.pubkey,
    staleTime: 60 * 1000, // 1 minute
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}