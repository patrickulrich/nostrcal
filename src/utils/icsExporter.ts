import { CalendarEvent } from '@/contexts/EventsContextTypes';

export interface ICSExportOptions {
  events: CalendarEvent[];
  calendarName?: string;
  description?: string;
}

export function exportToICS(options: ICSExportOptions): string {
  const { events, calendarName = 'NostrCal Events', description = 'Calendar events from NostrCal' } = options;

  const lines: string[] = [];

  // Calendar header
  lines.push('BEGIN:VCALENDAR');
  lines.push('VERSION:2.0');
  lines.push('PRODID:-//NostrCal//NostrCal//EN');
  lines.push('CALSCALE:GREGORIAN');
  lines.push('METHOD:PUBLISH');
  lines.push(`X-WR-CALNAME:${escapeText(calendarName)}`);
  lines.push(`X-WR-CALDESC:${escapeText(description)}`);

  // Add events
  for (const event of events) {
    const icsEvent = convertEventToICS(event);
    lines.push(...icsEvent);
  }

  // Calendar footer
  lines.push('END:VCALENDAR');

  return lines.join('\r\n');
}

function convertEventToICS(event: CalendarEvent): string[] {
  const lines: string[] = [];

  lines.push('BEGIN:VEVENT');

  // Required fields
  lines.push(`UID:${event.id || generateUID()}`);
  lines.push(`DTSTAMP:${formatDateTimeUTC(new Date())}`);

  // Title/Summary
  if (event.title) {
    lines.push(`SUMMARY:${escapeText(event.title)}`);
  }

  // Description
  if (event.description || event.content) {
    const description = event.description || event.content || '';
    lines.push(`DESCRIPTION:${escapeText(description)}`);
  }

  // Location
  if (event.location) {
    lines.push(`LOCATION:${escapeText(event.location)}`);
  }

  // Start and end times
  if (event.start) {
    const { dtStart, dtEnd } = formatEventDateTime(event);
    lines.push(dtStart);
    if (dtEnd) {
      lines.push(dtEnd);
    }
  }

  // Timezone
  if (event.timezone && event.kind === 31923) {
    // Only add timezone for time-based events
    lines.push(`DTSTART;TZID=${event.timezone}:${formatDateTime(new Date(parseInt(event.start!) * 1000))}`);
  }

  // Categories (hashtags)
  if (event.hashtags && event.hashtags.length > 0) {
    lines.push(`CATEGORIES:${event.hashtags.map(tag => escapeText(tag)).join(',')}`);
  }

  // Attendees (participants)
  if (event.participants && event.participants.length > 0) {
    for (const participant of event.participants) {
      // For Nostr pubkeys, we'll format them as attendees
      lines.push(`ATTENDEE;CN=${participant.slice(0, 8)}...;ROLE=REQ-PARTICIPANT:mailto:${participant}@nostr`);
    }
  }

  // Created timestamp
  if (event.created_at) {
    lines.push(`CREATED:${formatDateTimeUTC(new Date(event.created_at * 1000))}`);
  }

  // Last modified (use created time as fallback)
  lines.push(`LAST-MODIFIED:${formatDateTimeUTC(new Date(event.created_at ? event.created_at * 1000 : Date.now()))}`);

  // Status
  lines.push('STATUS:CONFIRMED');

  // Classification based on privacy
  if (event.source === 'private') {
    lines.push('CLASS:PRIVATE');
  } else {
    lines.push('CLASS:PUBLIC');
  }

  lines.push('END:VEVENT');

  return lines;
}

function formatEventDateTime(event: CalendarEvent): { dtStart: string; dtEnd?: string } {
  if (event.kind === 31922) {
    // Date-based event (all-day)
    const startDate = event.start!;
    const endDate = event.end || event.start!;
    
    return {
      dtStart: `DTSTART;VALUE=DATE:${startDate.replace(/-/g, '')}`,
      dtEnd: `DTEND;VALUE=DATE:${getNextDay(endDate).replace(/-/g, '')}`
    };
  } else if (event.kind === 31923) {
    // Time-based event
    const startTime = new Date(parseInt(event.start!) * 1000);
    const endTime = event.end ? new Date(parseInt(event.end) * 1000) : new Date(startTime.getTime() + 60 * 60 * 1000);
    
    return {
      dtStart: `DTSTART:${formatDateTimeUTC(startTime)}`,
      dtEnd: `DTEND:${formatDateTimeUTC(endTime)}`
    };
  }

  return { dtStart: `DTSTART:${formatDateTimeUTC(new Date())}` };
}

function formatDateTimeUTC(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

function formatDateTime(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  
  return `${year}${month}${day}T${hours}${minutes}${seconds}`;
}

function getNextDay(dateString: string): string {
  const date = new Date(dateString);
  date.setDate(date.getDate() + 1);
  return date.toISOString().split('T')[0];
}

function escapeText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r');
}

function generateUID(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}@nostrcal`;
}

export function downloadICSFile(icsContent: string, filename: string = 'nostrcal-events.ics') {
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
}

export function exportEventsAsICS(
  events: CalendarEvent[], 
  calendarName?: string, 
  filename?: string
) {
  const icsContent = exportToICS({
    events,
    calendarName: calendarName || 'NostrCal Events',
    description: `Exported from NostrCal on ${new Date().toLocaleDateString()}`
  });
  
  downloadICSFile(icsContent, filename);
}