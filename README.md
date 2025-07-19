# NostrCal

A decentralized calendar application built on the Nostr protocol, implementing NIP-52 calendar events with private event support and booking functionality.

## Features

- **Decentralized Calendar Events**: Create and manage calendar events using NIP-52 specification
- **Private Events**: End-to-end encrypted events using NIP-44 encryption and NIP-59 gift wraps
- **Booking System**: Calendar availability templates (kind 31926) with real-time slot booking
- **Multi-Relay Support**: General relays for public events, private relays for encrypted content
- **Profile Management**: Edit your Nostr profile with NIP-05 verification and Lightning addresses
- **File Uploads**: Image and file uploads via Blossom servers (BUD-03)
- **Authentication**: NIP-42 relay authentication for enhanced features
- **Theme Support**: Light/dark mode with system preference detection

## Technology Stack

- **React 18** with TypeScript for type-safe development
- **Vite** for fast development and building
- **TailwindCSS** for utility-first styling
- **shadcn/ui** for accessible, unstyled components
- **Nostrify** for Nostr protocol integration
- **TanStack Query** for data fetching and caching
- **React Router** for client-side routing
- **date-fns** for date manipulation

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

The built files will be in the `dist/` directory.

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

Two types of relays are supported:

- **General relays**: Public events, profiles, discovery (kind 10002)
- **Private relays**: Encrypted events with authentication (kind 10050)

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

### Setting Up Relays

1. Go to Settings → Relays
2. Configure general relays for public content
3. Set up private relays for encrypted events
4. Publish relay preferences to Nostr (recommended)

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

- **Calendar Events**: Full CRUD operations for calendar events
- **Booking System**: Availability templates and slot booking
- **Private Events**: NIP-59 encryption/decryption
- **Profile Management**: NIP-05 verification and metadata
- **File Uploads**: Blossom server integration
- **Relay Management**: Multi-relay configuration

## Configuration

The app uses local storage for configuration:

- Theme preferences (light/dark/system)
- Relay URLs and authentication settings
- Blossom server URLs for file uploads
- UI preferences

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
- **NIP-22**: Comment system
- **NIP-42**: Relay authentication
- **NIP-44**: Encryption/decryption
- **NIP-52**: Calendar events
- **NIP-57**: Lightning payments
- **NIP-59**: Gift wraps and seals
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