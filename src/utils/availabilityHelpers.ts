// Availability schedule utilities for NIP-52 calendar events

export interface TimeSlot {
  start: string;
  end: string;
}

export interface AvailabilitySchedule {
  [day: string]: TimeSlot[];
}

export interface ScheduleTag {
  day: string;
  start: string;
  end: string;
}

// ISO day codes mapping
export const DAY_CODES = {
  'sunday': 'SU',
  'monday': 'MO',
  'tuesday': 'TU',
  'wednesday': 'WE',
  'thursday': 'TH',
  'friday': 'FR',
  'saturday': 'SA'
};

export const DAY_CODES_REVERSE = {
  'SU': 'sunday',
  'MO': 'monday',
  'TU': 'tuesday',
  'WE': 'wednesday',
  'TH': 'thursday',
  'FR': 'friday',
  'SA': 'saturday'
};

/**
 * Generate NIP-52 schedule tags from availability object
 */
export function generateMergedScheduleTags(availability: AvailabilitySchedule): string[][] {
  const tags: string[][] = [];
  
  Object.entries(availability).forEach(([day, slots]) => {
    // Convert day name to ISO code
    const dayCode = DAY_CODES[day.toLowerCase() as keyof typeof DAY_CODES];
    if (!dayCode) return;
    
    // Merge overlapping slots
    const mergedSlots = mergeTimeBlocks(slots);
    
    // Create schedule tags
    mergedSlots.forEach(slot => {
      tags.push(['sch', dayCode, slot.start, slot.end]);
    });
  });
  
  return tags;
}

/**
 * Parse NIP-52 schedule tags back to availability object
 */
export function parseScheduleTagsToAvailability(tags: string[][]): AvailabilitySchedule {
  const availability: AvailabilitySchedule = {};
  
  tags.forEach(tag => {
    if (tag[0] === 'sch' && tag.length >= 4) {
      const [, dayCode, start, end] = tag;
      
      // Convert ISO day code to day name
      const dayName = DAY_CODES_REVERSE[dayCode as keyof typeof DAY_CODES_REVERSE];
      if (!dayName) return;
      
      if (!availability[dayName]) {
        availability[dayName] = [];
      }
      
      availability[dayName].push({ start, end });
    }
  });
  
  // Merge overlapping slots for each day
  Object.keys(availability).forEach(day => {
    availability[day] = mergeTimeBlocks(availability[day]);
  });
  
  return availability;
}

/**
 * Merge overlapping time blocks
 */
export function mergeTimeBlocks(blocks: TimeSlot[]): TimeSlot[] {
  if (blocks.length === 0) return [];
  
  // Sort blocks by start time
  const sortedBlocks = [...blocks].sort((a, b) => 
    timeToMinutes(a.start) - timeToMinutes(b.start)
  );
  
  const merged: TimeSlot[] = [sortedBlocks[0]];
  
  for (let i = 1; i < sortedBlocks.length; i++) {
    const current = sortedBlocks[i];
    const last = merged[merged.length - 1];
    
    // Check if current block overlaps with or is adjacent to the last merged block
    if (timeToMinutes(current.start) <= timeToMinutes(last.end)) {
      // Merge blocks by extending the end time
      last.end = minutesToTime(Math.max(
        timeToMinutes(last.end),
        timeToMinutes(current.end)
      ));
    } else {
      // No overlap, add as new block
      merged.push(current);
    }
  }
  
  return merged;
}

/**
 * Convert time string (HH:MM) to minutes since midnight
 */
export function timeToMinutes(timeStr: string): number {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * Convert minutes since midnight to time string (HH:MM)
 */
export function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

/**
 * Generate available time slots for a given date and availability template
 */
export function generateAvailableSlots(
  date: Date,
  availability: AvailabilitySchedule,
  duration: number, // in minutes
  interval: number = duration, // in minutes
  _timezone: string = 'UTC'
): TimeSlot[] {
  const dayName = date.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
  const daySlots = availability[dayName];
  
  if (!daySlots || daySlots.length === 0) {
    return [];
  }
  
  const slots: TimeSlot[] = [];
  
  daySlots.forEach(slot => {
    const startMinutes = timeToMinutes(slot.start);
    const endMinutes = timeToMinutes(slot.end);
    
    // Generate slots within this time block
    for (let current = startMinutes; current + duration <= endMinutes; current += interval) {
      slots.push({
        start: minutesToTime(current),
        end: minutesToTime(current + duration)
      });
    }
  });
  
  return slots;
}

/**
 * Check if a time slot conflicts with busy times
 */
export function hasConflict(
  slot: TimeSlot,
  busyTimes: TimeSlot[]
): boolean {
  const slotStart = timeToMinutes(slot.start);
  const slotEnd = timeToMinutes(slot.end);
  
  return busyTimes.some(busy => {
    const busyStart = timeToMinutes(busy.start);
    const busyEnd = timeToMinutes(busy.end);
    
    // Check for overlap
    return slotStart < busyEnd && slotEnd > busyStart;
  });
}

/**
 * Filter available slots by removing conflicts
 */
export function filterAvailableSlots(
  availableSlots: TimeSlot[],
  busyTimes: TimeSlot[]
): TimeSlot[] {
  return availableSlots.filter(slot => !hasConflict(slot, busyTimes));
}

/**
 * Convert Unix timestamp to time string (HH:MM)
 */
export function timestampToTime(timestamp: number, timezone: string = 'UTC'): string {
  const date = new Date(timestamp * 1000);
  return date.toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    timeZone: timezone
  });
}

/**
 * Convert time string to Unix timestamp for a given date
 */
export function timeToTimestamp(timeStr: string, date: Date, _timezone: string = 'UTC'): number {
  const [hours, minutes] = timeStr.split(':').map(Number);
  const dateTime = new Date(date);
  dateTime.setHours(hours, minutes, 0, 0);
  
  // This is a simplified version - in reality you'd need proper timezone handling
  return Math.floor(dateTime.getTime() / 1000);
}

/**
 * Calculate buffer time around a slot
 */
export function applyBufferTime(
  slot: TimeSlot,
  bufferBefore: number = 0,
  bufferAfter: number = 0
): TimeSlot {
  const startMinutes = timeToMinutes(slot.start) - bufferBefore;
  const endMinutes = timeToMinutes(slot.end) + bufferAfter;
  
  return {
    start: minutesToTime(Math.max(0, startMinutes)),
    end: minutesToTime(Math.min(24 * 60, endMinutes))
  };
}

/**
 * Validate time slot format
 */
export function isValidTimeSlot(slot: TimeSlot): boolean {
  const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
  
  if (!timeRegex.test(slot.start) || !timeRegex.test(slot.end)) {
    return false;
  }
  
  return timeToMinutes(slot.start) < timeToMinutes(slot.end);
}

/**
 * Parse duration from ISO 8601 format (PT30M) to minutes
 */
export function parseDuration(isoDuration: string): number {
  const match = isoDuration.match(/PT(\d+)M/);
  return match ? parseInt(match[1]) : 30; // Default to 30 minutes
}

/**
 * Format duration to ISO 8601 format
 */
export function formatDuration(minutes: number): string {
  return `PT${minutes}M`;
}