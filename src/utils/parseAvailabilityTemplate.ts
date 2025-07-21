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
  if (!duration) return 30; // default fallback
  
  // Handle both ISO-8601 format (PT30M) and legacy numeric format (30)
  if (duration.startsWith('PT') && duration.endsWith('M')) {
    const minutes = parseInt(duration.slice(2, -1));
    return isNaN(minutes) ? 30 : minutes;
  } else if (duration.match(/^PT(\d+)([DHMS])$/)) {
    // Handle other ISO 8601 duration formats
    const match = duration.match(/^PT(\d+)([DHMS])$/);
    if (!match) return 30;
    
    const value = parseInt(match[1]);
    const unit = match[2];
    
    switch (unit) {
      case 'D': return value * 24 * 60;
      case 'H': return value * 60;
      case 'M': return value;
      case 'S': return Math.round(value / 60);
      default: return 30;
    }
  } else {
    // Legacy numeric format
    const minutes = parseInt(duration);
    return isNaN(minutes) ? 30 : minutes;
  }
};

const parsePeriod = (period: string): number => {
  if (!period) return 0; // default for period fields
  
  // Parse ISO 8601 period to minutes (supports P[n]D format)
  const dayMatch = period.match(/P(\d+)D/);
  if (dayMatch) {
    return parseInt(dayMatch[1]) * 24 * 60;
  }
  
  // Fallback to duration parsing for PT format (PT30M, PT1440M, etc.)
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
        console.log(`❌ Invalid time format in schedule tag: ${start} - ${end}`);
        return;
      }
      
      if (!availability[day]) {
        availability[day] = [];
      }
      availability[day].push({ start, end });
    }
  });
  
  const durationTag = tags.find((t: string[]) => t[0] === 'duration')?.[1] || 'PT30M';
  const intervalTag = tags.find((t: string[]) => t[0] === 'interval')?.[1];
  const bufferTag = tags.find((t: string[]) => t[0] === 'buffer_before')?.[1] || 
                    tags.find((t: string[]) => t[0] === 'buffer')?.[1];
  const bufferAfterTag = tags.find((t: string[]) => t[0] === 'buffer_after')?.[1];
  const maxAdvanceTag = tags.find((t: string[]) => t[0] === 'max_advance')?.[1];
  

  const template: AvailabilityTemplate = {
    id: event.id,
    title: tags.find((t: string[]) => t[0] === 'title')?.[1] || 'Untitled Template',
    description: event.content || undefined,
    location: tags.find((t: string[]) => t[0] === 'location')?.[1],
    duration: parseDuration(durationTag),
    interval: intervalTag ? parseDuration(intervalTag) : undefined,
    bufferBefore: bufferTag ? parseDuration(bufferTag) : undefined,
    bufferAfter: bufferAfterTag ? parseDuration(bufferAfterTag) : undefined,
    timezone: tags.find((t: string[]) => t[0] === 'tzid')?.[1] || 
              tags.find((t: string[]) => t[0] === 'timezone')?.[1] || 'UTC', // Legacy fallback
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
    maxAdvance: maxAdvanceTag ? parsePeriod(maxAdvanceTag) : undefined,
    maxAdvanceBusiness: (() => {
      const maxAdvanceBusinessTag = tags.find((t: string[]) => t[0] === 'max_advance_business')?.[1];
      return maxAdvanceBusinessTag === 'true';
    })()
  };


  return template;
};