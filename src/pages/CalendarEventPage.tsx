import { useParams } from 'react-router-dom';
import { nip19 } from 'nostr-tools';
import NotFound from './NotFound';
import { useCalendarEventByNaddr } from '@/hooks/useCalendarEventByNaddr';
import { CalendarEventView, CalendarEventViewSkeleton } from '@/components/CalendarEventView';

export function CalendarEventPage() {
  const { naddr } = useParams<{ naddr: string }>();

  if (!naddr) {
    return <NotFound />;
  }

  // Validate that this is actually an naddr
  let decoded;
  try {
    decoded = nip19.decode(naddr);
  } catch {
    return <NotFound />;
  }

  if (decoded.type !== 'naddr') {
    return <NotFound />;
  }

  // Check if it's a calendar event (kinds 31922-31927, excluding 31926 which is for booking)
  const naddr_data = decoded.data;
  if (![31922, 31923, 31924, 31925, 31927].includes(naddr_data.kind)) {
    return <NotFound />;
  }

  return <CalendarEventHandler naddr={naddr} />;
}

function CalendarEventHandler({ naddr }: { naddr: string }) {
  const { data: event, isLoading, error } = useCalendarEventByNaddr(naddr);

  if (isLoading) {
    return <CalendarEventViewSkeleton />;
  }

  if (error || !event) {
    return <NotFound />;
  }

  return <CalendarEventView event={event} />;
}

export default CalendarEventPage;