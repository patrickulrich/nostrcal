import { useState, useEffect, useRef } from 'react';
import { geocodeAddress, isPhysicalAddress, type GeocodingResult } from '@/utils/geocoding';

interface CalendarEventBase {
  id: string;
  location?: string;
}

export type EventWithCoordinates<T extends CalendarEventBase = CalendarEventBase> = T & {
  coordinates?: GeocodingResult;
  geocodingStatus: 'pending' | 'success' | 'failed' | 'not_applicable';
};

/**
 * Hook to geocode calendar events with physical addresses
 */
export function useEventGeocoding<T extends CalendarEventBase>(events: T[]) {
  const [geocodedEvents, setGeocodedEvents] = useState<EventWithCoordinates<T>[]>([]);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [geocodingProgress, setGeocodingProgress] = useState({ current: 0, total: 0 });

  // Use useRef to track the previous events and only update when content actually changes
  const [stableEvents, setStableEvents] = useState<T[]>([]);
  const previousEventsKey = useRef<string>('');

  // Only update stable events when the actual content changes
  useEffect(() => {
    const currentKey = JSON.stringify(events.map(e => ({ id: e.id, location: e.location })));
    if (currentKey !== previousEventsKey.current) {
      previousEventsKey.current = currentKey;
      setStableEvents(events);
    }
  }, [events]);

  useEffect(() => {
    const geocodeEvents = async () => {
      if (!stableEvents || stableEvents.length === 0) {
        setGeocodedEvents([]);
        return;
      }

      // Initialize events with status
      const initialEvents: EventWithCoordinates<T>[] = stableEvents.map(event => ({
        ...event,
        geocodingStatus: isPhysicalAddress(event.location || '') ? 'pending' : 'not_applicable'
      }));
      
      setGeocodedEvents(initialEvents);

      // Filter events that need geocoding
      const eventsToGeocode = initialEvents.filter(event => event.geocodingStatus === 'pending');
      
      if (eventsToGeocode.length === 0) {
        return;
      }

      setIsGeocoding(true);
      setGeocodingProgress({ current: 0, total: eventsToGeocode.length });

      // Process events one by one to respect rate limits
      const updatedEvents = [...initialEvents];
      
      for (let i = 0; i < eventsToGeocode.length; i++) {
        const event = eventsToGeocode[i];
        const eventIndex = updatedEvents.findIndex(e => e.id === event.id);
        
        if (eventIndex === -1 || !event.location) continue;

        try {
          const coordinates = await geocodeAddress(event.location);
          
          updatedEvents[eventIndex] = {
            ...updatedEvents[eventIndex],
            coordinates: coordinates || undefined,
            geocodingStatus: coordinates ? 'success' : 'failed'
          };
        } catch (error) {
          console.warn('Geocoding failed for event:', event.id, error);
          updatedEvents[eventIndex] = {
            ...updatedEvents[eventIndex],
            geocodingStatus: 'failed'
          };
        }

        setGeocodingProgress({ current: i + 1, total: eventsToGeocode.length });
        setGeocodedEvents([...updatedEvents]);
      }

      setIsGeocoding(false);
    };

    geocodeEvents();
  }, [stableEvents]);

  // Get only events that have been successfully geocoded
  const eventsWithCoordinates = geocodedEvents.filter(
    event => event.geocodingStatus === 'success' && event.coordinates
  );

  // Get events that failed to geocode but have physical addresses
  const failedGeocodingEvents = geocodedEvents.filter(
    event => event.geocodingStatus === 'failed'
  );

  return {
    geocodedEvents,
    eventsWithCoordinates,
    failedGeocodingEvents,
    isGeocoding,
    geocodingProgress,
    hasGeocodedEvents: eventsWithCoordinates.length > 0,
    totalPhysicalEvents: geocodedEvents.filter(
      event => event.geocodingStatus !== 'not_applicable'
    ).length
  };
}