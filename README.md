# NostrCal

A decentralized Progressive Web App (PWA) calendar built on the Nostr protocol, implementing NIP-52 calendar events with private event support, booking functionality, and offline-capable background notifications.

## Features

### Core Calendar Features
- **Decentralized Calendar Events**: Create and manage calendar events using NIP-52 specification
- **Private Events**: End-to-end encrypted events using NIP-44 encryption and NIP-59 gift wraps
- **Booking System**: Calendar availability templates (kind 31926) with real-time slot booking and Lightning payments
- **Multi-Relay Support**: General relays for public events, private relays for encrypted content
- **Intelligent Relay Routing**: Full NIP-65 (Relay List Metadata) support for optimal event discovery

### PWA Capabilities
- **Offline Functionality**: Full calendar access without internet connection
- **Background Notifications**: Event reminders even when app is closed
- **Installable**: Add to home screen on mobile and desktop
- **Push Notifications**: Real-time event reminders via service workers
- **Data Persistence**: Notification preferences and cached data stored locally

### User Experience
- **Profile Management**: Edit your Nostr profile with NIP-05 verification and Lightning addresses
- **File Uploads**: Image and file uploads via Blossom servers (BUD-03)
- **Authentication**: NIP-42 relay authentication for enhanced features
- **Theme Support**: Light/dark mode with system preference detection
- **Real-time Updates**: Live calendar updates across all connected devices

## Technology Stack

### Core Framework
- **React 18** with TypeScript for type-safe development
- **Vite** for fast development and building
- **TailwindCSS** for utility-first styling
- **shadcn/ui** for accessible, unstyled components

### Progressive Web App (PWA)
- **Service Workers** with Workbox for offline functionality
- **IndexedDB** for client-side data persistence
- **Background Notifications** for event reminders
- **vite-plugin-pwa** for PWA manifest and service worker generation
- **Cache-first strategies** for images and static assets

### Nostr Integration
- **Nostrify** for Nostr protocol implementation
- **NIP-65 Outbox Model** for intelligent relay routing
- **NIP-59 Gift Wraps** for private event encryption
- **NIP-42 AUTH** for relay authentication

### Data Management
- **TanStack Query** for server state management and caching
- **React Context** for global state management
- **React Router** for client-side routing
- **date-fns** for date manipulation and formatting

### Development & Testing
- **Vitest** for unit testing
- **ESLint** with React rules for code quality
- **TypeScript** strict mode for type safety
- **Testing Library** for component testing

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- A Nostr browser extension (like Alby, nos2x, or Flamingo) for signing

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd nostrcalendar
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open your browser to `http://localhost:8080`

### Building for Production

```bash
npm run build
```

The built files will be in the `dist/` directory, including:
- PWA manifest and service worker
- Pre-cached static assets for offline use
- Optimized bundles with code splitting

### Running Tests

```bash
npm run test
```

This runs TypeScript compilation, ESLint checks, Vitest tests, and builds the project.

## Nostr Protocol Implementation

### Calendar Events (NIP-52)

NostrCal implements the full NIP-52 specification:

- **Date-based events** (kind 31922): All-day or multi-day events
- **Time-based events** (kind 31923): Events with specific start/end times
- **Calendar collections** (kind 31924): Organize events into calendars
- **RSVPs** (kind 31925): Respond to calendar events
- **Availability templates** (kind 31926): Define recurring availability for bookings
- **Availability blocks** (kind 31927): Mark busy times without exposing details

### Private Calendar Events

Private events use NIP-59 encryption:

- Events are sealed (kind 13) and gift-wrapped (kind 1059)
- Each participant receives an individually encrypted copy
- Uses NIP-44 encryption for forward secrecy
- Private relay preferences (kind 10050) for secure delivery

### Relay Configuration

NostrCal implements advanced relay management with NIP-65 support:

- **General relays**: Public events, profiles, discovery (kind 10002)
  - Read/write permissions per relay
  - Automatic propagation of relay preferences
  - Header-added relays default to read-only
- **Private relays**: Encrypted events with authentication (kind 10050)
  - AUTH-enabled relay prioritization for NIP-59 privacy
  - Visual indicators for AUTH-supported relays
  - Recommended: relay.nostrcal.com, auth.nostr1.com, inbox.nostr.wine

#### NIP-65 Intelligent Routing

NostrCal uses the Outbox Model for optimal event discovery:
- **Queries**: Automatically routes to authors' write relays
- **Publishing**: Sends events to mentioned users' read relays
- **Profile Discovery**: Caches author relay preferences for better metadata loading
- **Performance**: 5-minute relay cache prevents redundant lookups

## Usage

### Creating Events

1. Log in with your Nostr browser extension
2. Navigate to "New Event" 
3. Choose between public or private events
4. Fill in event details (title, description, date/time, location)
5. Add participants for private events
6. Publish to your configured relays

### Booking System

1. Create an availability template (kind 31926) with your open hours
2. Share the booking link using NIP-19 naddr format (supports NIP-21 nostr: URI scheme)
3. Users can select available time slots and submit booking requests
4. Booking requests are sent as private calendar events
5. Accept/decline requests to update your calendar

Booking links are generated as `nostr:naddr1...` identifiers that work across all Nostr clients for maximum interoperability.

### Lightning Payments (NIP-57)

NostrCal supports Lightning payments for paid booking appointments:

#### Paid Availability Templates

1. **Creating Paid Templates**: Set an amount in sats when creating availability templates
2. **Payment Verification**: Users must complete Lightning payment before booking
3. **Zap Integration**: Uses proper NIP-57 zap requests for Bitcoin payments
4. **Receipt Validation**: Verifies zap receipts before granting booking access

#### Payment Flow

1. User selects a paid availability slot
2. Lightning payment component generates real invoice via LNURL
3. User pays with any Lightning wallet
4. Payment is verified through zap receipts (kind 9735)
5. Booking proceeds only after successful payment

#### LNURL Support

- **Lightning Addresses**: Supports modern user@domain.com format (LUD-16)
- **LNURL**: Traditional bech32 LNURL format (LUD-06)  
- **Real Invoices**: Generates actual bolt11 invoices via recipient's Lightning service
- **Error Handling**: Clear feedback for payment failures and missing LNURL setup

#### Booking Tracking

The `/booking` page provides comprehensive payment tracking:

- **Pending**: Booking requests awaiting organizer response
- **Pending Payment**: Requests requiring payment but not yet paid
- **Approved**: Successfully confirmed bookings
- **Declined**: Rejected booking requests

Recipients need Lightning Address or LNURL in their Nostr profile (`lud16` or `lud06` fields) to receive payments.

### Comments and Reactions

NostrCal includes a comprehensive comment system for calendar events with full NIP-25 reaction support:

#### Commenting on Events

1. **View Comments**: Comments appear on event detail pages and modals
2. **Add Comments**: Click "Add Comment" to share thoughts about events
3. **Threaded Replies**: Reply to specific comments to create discussion threads
4. **Manage Comments**: Comment authors can delete their own comments via hamburger menu

#### Reactions (NIP-25)

1. **Quick Like**: Click the thumbs up button for instant likes
2. **Emoji Reactions**: Use the + button to pick from 10 emoji options:
   - ❤️ Love, 👍 Thumbs up, 😂 Laugh, 😢 Sad, 😮 Wow
   - 😡 Angry, 🔥 Fire, 🎉 Celebrate, 👎 Dislike
3. **Toggle Reactions**: Click the same reaction again to remove it
4. **Reaction Summary**: See counts and types of all reactions on comments

#### Features

- **Real-time Updates**: Comments and reactions update immediately
- **Threaded Discussions**: Nested replies up to 3 levels deep
- **Ownership Control**: Only authors can delete their own comments
- **Login Required**: Reactions and commenting require Nostr authentication
- **Cross-Client**: Comments and reactions work across all Nostr clients

### Setting Up Relays

1. Go to Settings → Relays
2. Configure general relays for public content
   - Set read/write permissions per relay
   - Keep 2-4 read and 2-4 write relays for optimal performance
3. Set up private relays for encrypted events
   - Prioritize AUTH-enabled relays (purple badges)
   - Use suggested AUTH relays for maximum privacy
4. Publish relay preferences to Nostr (recommended)
   - Publishes kind 10002 (general) and kind 10050 (private)
   - Enables other clients to find you efficiently

## File Structure

```
src/
├── components/          # React components
│   ├── ui/             # shadcn/ui components
│   ├── auth/           # Authentication components
│   └── comments/       # Comment system (NIP-22)
├── hooks/              # Custom React hooks
├── pages/              # Page components
├── utils/              # Utility functions
├── contexts/           # React contexts
└── lib/                # Shared libraries
```

## Key Components

### Calendar & Events
- **Calendar Events**: Full CRUD operations for calendar events
- **Private Events**: NIP-59 encryption/decryption with gift-wrap handling
- **Booking System**: Availability templates and slot booking with Lightning payments
- **Lightning Payments**: NIP-57 zap integration with LNURL workflow and payment verification

### PWA & Notifications
- **Service Worker**: Background processing and offline functionality
- **Notification System**: Event reminders with customizable timing
- **IndexedDB Storage**: Client-side persistence for preferences and cached data
- **Background Sync**: Offline-first data synchronization

### Social Features  
- **Comment System**: NIP-22 threaded comments with edit/delete functionality and NIP-25 reactions
- **Reactions**: Like, emoji, and custom reactions on comments using NIP-25
- **Profile Management**: NIP-05 verification and metadata

### Infrastructure
- **File Uploads**: Blossom server integration
- **Relay Management**: Multi-relay configuration with NIP-65 intelligent routing
- **Authentication**: NIP-42 relay authentication

## Configuration

The app uses multiple storage mechanisms:

### LocalStorage
- Theme preferences (light/dark/system)
- Relay URLs and authentication settings
- Blossom server URLs for file uploads
- UI preferences

### IndexedDB (PWA)
- Notification preferences and schedules
- Cached calendar events for offline access
- Service worker configuration
- Background sync queue

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make changes and add tests
4. Run the test suite: `npm run test`
5. Commit changes: `git commit -m "Description"`
6. Push to your fork and create a pull request

### Development Guidelines

- Follow TypeScript best practices
- Use existing shadcn/ui components when possible
- Add tests for new functionality
- Follow NIP specifications exactly
- Keep console output clean (no debug logs in production)

## Nostr NIPs Implemented

- **NIP-01**: Basic protocol flow
- **NIP-05**: DNS-based verification
- **NIP-07**: Browser extension signing
- **NIP-09**: Event deletion
- **NIP-10**: Text notes and threads  
- **NIP-19**: bech32-encoded entities (npub, note, naddr, nevent, nprofile)
- **NIP-21**: nostr: URI scheme for interoperability
- **NIP-22**: Comment system (with threaded replies, edit/delete functionality)
- **NIP-25**: Reactions (likes, emojis on comments and content)
- **NIP-42**: Relay authentication
- **NIP-44**: Encryption/decryption
- **NIP-52**: Calendar events
- **NIP-57**: Lightning zaps (full LNURL workflow, payment verification, paid bookings)
- **NIP-59**: Gift wraps and seals (with AUTH relay prioritization)
- **NIP-65**: Relay List Metadata (Outbox Model)
- **NIP-94**: File metadata
- **BUD-03**: Blossom file storage

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support and questions:
- Open an issue on GitHub
- Join the Nostr developer community
- Check the NIP specifications at https://nips.be

---

*Vibed with [MKStack](https://soapbox.pub/mkstack)*