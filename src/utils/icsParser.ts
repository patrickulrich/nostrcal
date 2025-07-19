import ICAL from 'ical.js';

export interface ParsedICSEvent {
  title: string;
  description: string;
  location: string;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  isAllDay: boolean;
  timezone: string;
  participants: string[];
  hashtags: string[];
}

export function parseICSFile(icsContent: string): ParsedICSEvent[] {
  try {
    const jcalData = ICAL.parse(icsContent);
    const comp = new ICAL.Component(jcalData);
    const events: ParsedICSEvent[] = [];

    // Get all VEVENT components
    const vevents = comp.getAllSubcomponents('vevent');

    for (const vevent of vevents) {
      const event = new ICAL.Event(vevent);

      // Extract basic event information
      const title = event.summary || 'Untitled Event';
      const description = event.description || '';
      const location = event.location || '';

      // Handle start and end times
      const startTime = event.startDate;
      const endTime = event.endDate;

      let isAllDay = false;
      let startDate = '';
      let endDate = '';
      let startTimeStr = '';
      let endTimeStr = '';
      let timezone = '';

      if (startTime) {
        // Check if it's an all-day event
        isAllDay = startTime.isDate;
        timezone = startTime.timezone || 'UTC';

        if (isAllDay) {
          // All-day events use date format
          startDate = startTime.toJSDate().toISOString().split('T')[0];
          endDate = endTime ? endTime.toJSDate().toISOString().split('T')[0] : startDate;
        } else {
          // Timed events use datetime format
          const startJS = startTime.toJSDate();
          const endJS = endTime ? endTime.toJSDate() : new Date(startJS.getTime() + 60 * 60 * 1000);

          startDate = startJS.toISOString().split('T')[0];
          endDate = endJS.toISOString().split('T')[0];
          startTimeStr = startJS.toTimeString().slice(0, 5); // HH:MM format
          endTimeStr = endJS.toTimeString().slice(0, 5);
        }
      }

      // Extract participants from attendees
      const participants: string[] = [];
      const attendeeProps = vevent.getAllProperties('attendee');
      for (const attendee of attendeeProps) {
        const email = attendee.getFirstValue();
        if (email && typeof email === 'string') {
          // For Nostr, we'd need to convert emails to pubkeys somehow
          // For now, just store the email as a placeholder
          participants.push(email);
        }
      }

      // Extract hashtags from categories or description
      const hashtags: string[] = [];
      const categories = vevent.getFirstPropertyValue('categories');
      if (categories) {
        if (Array.isArray(categories)) {
          hashtags.push(...categories.map(cat => cat.toString()));
        } else {
          hashtags.push(categories.toString());
        }
      }

      // Also extract hashtags from description
      const hashtagMatches = description.match(/#\w+/g);
      if (hashtagMatches) {
        hashtags.push(...hashtagMatches.map(tag => tag.slice(1))); // Remove # symbol
      }

      events.push({
        title,
        description,
        location,
        startDate,
        endDate,
        startTime: startTimeStr,
        endTime: endTimeStr,
        isAllDay,
        timezone,
        participants,
        hashtags: [...new Set(hashtags)] // Remove duplicates
      });
    }

    return events;
  } catch (error) {
    console.error('Failed to parse ICS file:', error);
    throw new Error('Invalid ICS file format');
  }
}

export function validateICSFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.name.toLowerCase().endsWith('.ics')) {
      reject(new Error('File must have .ics extension'));
      return;
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      reject(new Error('File size must be less than 5MB'));
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (!content) {
        reject(new Error('Could not read file content'));
        return;
      }

      // Basic validation - check if it looks like an ICS file
      if (!content.includes('BEGIN:VCALENDAR') || !content.includes('END:VCALENDAR')) {
        reject(new Error('Invalid ICS file format - missing calendar markers'));
        return;
      }

      resolve(content);
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };

    reader.readAsText(file);
  });
}