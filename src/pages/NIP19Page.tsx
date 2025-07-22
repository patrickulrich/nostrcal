import { nip19 } from 'nostr-tools';
import { useParams } from 'react-router-dom';
import NotFound from './NotFound';

export function NIP19Page() {
  const { nip19: identifier } = useParams<{ nip19: string }>();

  if (!identifier) {
    return <NotFound />;
  }

  let decoded;
  try {
    decoded = nip19.decode(identifier);
  } catch {
    return <NotFound />;
  }

  const { type } = decoded;

  switch (type) {
    case 'npub':
    case 'nprofile':
      // AI agent should implement profile view here
      return <div>Profile placeholder</div>;

    case 'note':
      // AI agent should implement note view here
      return <div>Note placeholder</div>;

    case 'nevent':
      // AI agent should implement event view here
      return <div>Event placeholder</div>;

    case 'naddr': {
      // Calendar and booking naddrs are now handled by specific routes:
      // - /events/:naddr for calendar events (kinds 31922-31925, 31927)
      // - /booking/:naddr for availability templates (kind 31926)
      // This route handles other addressable events
      const naddr_data = decoded.data;
      if ([31922, 31923, 31924, 31925, 31926, 31927].includes(naddr_data.kind)) {
        // Redirect to appropriate specialized route
        if (naddr_data.kind === 31926) {
          window.location.href = `/booking/${identifier}`;
        } else {
          window.location.href = `/events/${identifier}`;
        }
        return <div>Redirecting...</div>;
      }
      // Other addressable events - placeholder for future implementation
      return <div>Non-calendar addressable event placeholder</div>;
    }

    default:
      return <NotFound />;
  }
} 