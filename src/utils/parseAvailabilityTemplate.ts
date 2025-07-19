interface AvailabilityTemplate {
  id: string;
  title: string;
  description?: string;
  location?: string;
  duration: number;
  interval?: number;
  bufferBefore?: number;
  bufferAfter?: number;
  timezone: string;
  calendarRef?: string;
  amount?: number;
  minNotice?: number; // minutes
  maxAdvance?: number; // minutes
  maxAdvanceBusiness?: boolean;
  availability: { [day: string]: { start: string; end: string }[] };
  pubkey: string;
}

const parseDuration = (duration: string): number => {
  // Parse ISO 8601 duration to minutes
  const match = duration.match(/PT?(\d+)([DHMS])/);
  if (!match) return 0;
  
  const value = parseInt(match[1]);
  const unit = match[2];
  
  switch (unit) {
    case 'D': return value * 24 * 60;
    case 'H': return value * 60;
    case 'M': return value;
    case 'S': return value / 60;
    default: return 0;
  }
};

const parsePeriod = (period: string): number => {
  // Parse ISO 8601 period to minutes (supports P[n]D format)
  const dayMatch = period.match(/P(\d+)D/);
  if (dayMatch) {
    return parseInt(dayMatch[1]) * 24 * 60;
  }
  
  // Fallback to duration parsing for PT format
  return parseDuration(period);
};

export const parseAvailabilityTemplate = (event: { tags: string[][], id: string, pubkey: string, content: string }): AvailabilityTemplate => {
  const tags = event.tags;
  const availability: { [day: string]: { start: string; end: string }[] } = {};
  
  // Parse availability from multiple sch tags (NIP-52 format)
  tags.forEach((tag: string[]) => {
    if (tag[0] === 'sch' && tag.length >= 4) {
      const day = tag[1];
      const start = tag[2];
      const end = tag[3];
      
      // Validate time format (HH:MM)
      const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
      if (!timeRegex.test(start) || !timeRegex.test(end)) {
        return;
      }
      
      if (!availability[day]) {
        availability[day] = [];
      }
      availability[day].push({ start, end });
    }
  });
  
  const template: AvailabilityTemplate = {
    id: event.id,
    title: tags.find((t: string[]) => t[0] === 'title')?.[1] || 'Untitled Template',
    description: event.content || undefined,
    location: tags.find((t: string[]) => t[0] === 'location')?.[1],
    duration: parseDuration(tags.find((t: string[]) => t[0] === 'duration')?.[1] || 'PT30M'),
    interval: (() => {
      const intervalTag = tags.find((t: string[]) => t[0] === 'interval')?.[1];
      return intervalTag ? parseDuration(intervalTag) : undefined;
    })(),
    bufferBefore: (() => {
      const bufferTag = tags.find((t: string[]) => t[0] === 'buffer_before')?.[1];
      return bufferTag ? parseDuration(bufferTag) : undefined;
    })(),
    bufferAfter: (() => {
      const bufferTag = tags.find((t: string[]) => t[0] === 'buffer_after')?.[1];
      return bufferTag ? parseDuration(bufferTag) : undefined;
    })(),
    timezone: tags.find((t: string[]) => t[0] === 'tzid')?.[1] || 'UTC',
    availability,
    pubkey: event.pubkey,
    calendarRef: tags.find((t: string[]) => t[0] === 'a')?.[1],
    amount: (() => {
      const amountTag = tags.find((t: string[]) => t[0] === 'amount')?.[1];
      return amountTag ? parseInt(amountTag) : undefined;
    })(),
    minNotice: (() => {
      const minNoticeTag = tags.find((t: string[]) => t[0] === 'min_notice')?.[1];
      return minNoticeTag ? parsePeriod(minNoticeTag) : undefined;
    })(),
    maxAdvance: (() => {
      const maxAdvanceTag = tags.find((t: string[]) => t[0] === 'max_advance')?.[1];
      return maxAdvanceTag ? parsePeriod(maxAdvanceTag) : undefined;
    })(),
    maxAdvanceBusiness: (() => {
      const maxAdvanceBusinessTag = tags.find((t: string[]) => t[0] === 'max_advance_business')?.[1];
      return maxAdvanceBusinessTag === 'true';
    })()
  };

  return template;
};