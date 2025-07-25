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

      // Process events in parallel batches to improve performance while respecting rate limits
      const updatedEvents = [...initialEvents];
      const BATCH_SIZE = 5; // Process 5 addresses concurrently
      const BATCH_DELAY = 1000; // 1 second delay between batches
      
      for (let i = 0; i < eventsToGeocode.length; i += BATCH_SIZE) {
        const batch = eventsToGeocode.slice(i, i + BATCH_SIZE);
        
        // Process batch in parallel
        const batchPromises = batch.map(async (event) => {
          const eventIndex = updatedEvents.findIndex(e => e.id === event.id);
          
          if (eventIndex === -1 || !event.location) return null;

          try {
            const coordinates = await geocodeAddress(event.location);
            
            return {
              eventIndex,
              coordinates: coordinates || undefined,
              geocodingStatus: coordinates ? 'success' as const : 'failed' as const
            };
          } catch (error) {
            console.warn('Geocoding failed for event:', event.id, error);
            return {
              eventIndex,
              coordinates: undefined,
              geocodingStatus: 'failed' as const
            };
          }
        });

        // Wait for batch to complete
        const batchResults = await Promise.all(batchPromises);
        
        // Update events with batch results
        batchResults.forEach(result => {
          if (result && result.eventIndex !== -1) {
            updatedEvents[result.eventIndex] = {
              ...updatedEvents[result.eventIndex],
              coordinates: result.coordinates,
              geocodingStatus: result.geocodingStatus
            };
          }
        });

        setGeocodingProgress({ current: Math.min(i + BATCH_SIZE, eventsToGeocode.length), total: eventsToGeocode.length });
        setGeocodedEvents([...updatedEvents]);
        
        // Add delay between batches to avoid rate limiting (except for last batch)
        if (i + BATCH_SIZE < eventsToGeocode.length) {
          await new Promise(resolve => setTimeout(resolve, BATCH_DELAY));
        }
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