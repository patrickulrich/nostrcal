interface AvailabilityTemplate {
  id: string;
  title: string;
  description?: string;
  location?: string;
  duration: number;
  buffer: number;
  timezone: string;
  calendarRef?: string;
  amount?: number;
  minNotice?: number;
  maxAdvance?: number;
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

export const parseAvailabilityTemplate = (event: { tags: string[][], id: string, pubkey: string, content: string }): AvailabilityTemplate => {
  console.log('🔍 parseAvailabilityTemplate - Raw event:', event);
  const tags = event.tags;
  console.log('🔍 parseAvailabilityTemplate - All tags:', tags);
  const availability: { [day: string]: { start: string; end: string }[] } = {};
  
  // Parse availability from multiple availability tags
  tags.forEach((tag: string[]) => {
    if (tag[0] === 'availability' && tag.length >= 4) {
      const day = tag[1];
      const start = tag[2];
      const end = tag[3];
      
      if (!availability[day]) {
        availability[day] = [];
      }
      availability[day].push({ start, end });
    }
  });
  
  const template: AvailabilityTemplate = {
    id: event.id,
    title: tags.find((t: string[]) => t[0] === 'title')?.[1] || 'Untitled Template',
    description: tags.find((t: string[]) => t[0] === 'description')?.[1],
    location: tags.find((t: string[]) => t[0] === 'location')?.[1],
    duration: parseInt(tags.find((t: string[]) => t[0] === 'duration')?.[1] || '60'),
    buffer: parseInt(tags.find((t: string[]) => t[0] === 'buffer')?.[1] || '0'),
    timezone: tags.find((t: string[]) => t[0] === 'timezone')?.[1] || 'UTC',
    availability,
    pubkey: event.pubkey,
    calendarRef: tags.find((t: string[]) => t[0] === 'a')?.[1],
    amount: tags.find((t: string[]) => t[0] === 'amount')?.[1] 
      ? parseInt(tags.find((t: string[]) => t[0] === 'amount')?.[1] || '0') : undefined,
    minNotice: tags.find((t: string[]) => t[0] === 'min_notice')?.[1] 
      ? parseDuration(tags.find((t: string[]) => t[0] === 'min_notice')?.[1] || 'PT0M') : undefined,
    maxAdvance: tags.find((t: string[]) => t[0] === 'max_advance')?.[1]
      ? parseDuration(tags.find((t: string[]) => t[0] === 'max_advance')?.[1] || 'PT0M') : undefined
  };

  console.log('🔍 parseAvailabilityTemplate - Final template:', template);
  return template;
};