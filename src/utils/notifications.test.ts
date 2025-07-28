import { describe, it, expect } from 'vitest';
import { getEventUrl, getEventTitle, getEventStartTime } from './notifications';

describe('notification utilities', () => {
  describe('getEventUrl', () => {
    it('should return /calendar/{id} URL for private events', () => {
      const privateEvent = {
        id: 'private-event-123',
        kind: 31923,
        pubkey: 'test-pubkey',
        created_at: 1234567890,
        tags: [
          ['d', 'test-event'],
          ['title', 'Private Event']
        ],
        content: 'Private event content',
        source: 'private'
      };

      const url = getEventUrl(privateEvent);
      expect(url).toBe('/calendar/private-event-123');
    });

    it('should return /calendar/{id} URL for privateDayEvents', () => {
      const privateEvent = {
        id: 'private-day-event-123',
        kind: 31922,
        pubkey: 'test-pubkey',
        created_at: 1234567890,
        tags: [
          ['d', 'test-day-event'],
          ['title', 'Private Day Event']
        ],
        content: 'Private day event content',
        source: 'privateDayEvents'
      };

      const url = getEventUrl(privateEvent);
      expect(url).toBe('/calendar/private-day-event-123');
    });

    it('should return /events/{naddr} URL for public events', () => {
      const publicEvent = {
        id: 'public-event-123',
        kind: 31923,
        pubkey: '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
        created_at: 1234567890,
        tags: [
          ['d', 'test-public-event'],
          ['title', 'Public Event']
        ],
        content: 'Public event content',
        source: 'public'
      };

      const url = getEventUrl(publicEvent);
      expect(url).toMatch(/^\/events\/naddr1/);
    });

    it('should fallback to /calendar/{id} for events without d-tag', () => {
      const eventWithoutDTag = {
        id: 'no-dtag-event-123',
        kind: 31923,
        pubkey: 'test-pubkey',
        created_at: 1234567890,
        tags: [
          ['title', 'Event Without D-Tag']
        ],
        content: 'Event without d-tag'
      };

      const url = getEventUrl(eventWithoutDTag);
      expect(url).toBe('/calendar/no-dtag-event-123');
    });

    it('should fallback to /calendar/{id} for events outside calendar kind range', () => {
      const nonCalendarEvent = {
        id: 'non-calendar-event-123',
        kind: 1,
        pubkey: 'test-pubkey',
        created_at: 1234567890,
        tags: [
          ['d', 'test-event']
        ],
        content: 'Non-calendar event'
      };

      const url = getEventUrl(nonCalendarEvent);
      expect(url).toBe('/calendar/non-calendar-event-123');
    });
  });

  describe('getEventTitle', () => {
    it('should extract title from event tags', () => {
      const event = {
        id: 'test-event',
        kind: 31923,
        pubkey: 'test-pubkey',
        created_at: 1234567890,
        tags: [
          ['title', 'Test Event Title']
        ],
        content: 'Event content'
      };

      const title = getEventTitle(event);
      expect(title).toBe('Test Event Title');
    });

    it('should return default title when no title tag exists', () => {
      const event = {
        id: 'test-event',
        kind: 31923,
        pubkey: 'test-pubkey',
        created_at: 1234567890,
        tags: [],
        content: 'Event content'
      };

      const title = getEventTitle(event);
      expect(title).toBe('Calendar Event');
    });
  });

  describe('getEventStartTime', () => {
    it('should parse start time for RSVP events with inherited timestamp', () => {
      const rsvpEvent = {
        id: 'rsvp-event-123',
        kind: 31925,
        pubkey: 'test-pubkey',
        created_at: 1234567890,
        tags: [['d', 'test-rsvp']],
        content: '',
        start: '1640995200' // Unix timestamp as string
      };

      const startTime = getEventStartTime(rsvpEvent);
      expect(startTime).toBeInstanceOf(Date);
      expect(startTime?.getTime()).toBe(1640995200 * 1000);
    });

    it('should parse start time for RSVP events with inherited ISO date', () => {
      const rsvpEvent = {
        id: 'rsvp-event-123',
        kind: 31925,
        pubkey: 'test-pubkey',
        created_at: 1234567890,
        tags: [['d', 'test-rsvp']],
        content: '',
        start: '2022-01-01T12:00:00Z' // ISO date string
      };

      const startTime = getEventStartTime(rsvpEvent);
      expect(startTime).toBeInstanceOf(Date);
      expect(startTime?.toISOString()).toBe('2022-01-01T12:00:00.000Z');
    });

    it('should return null for RSVP events without inherited start time', () => {
      const rsvpEvent = {
        id: 'rsvp-event-123',
        kind: 31925,
        pubkey: 'test-pubkey',
        created_at: 1234567890,
        tags: [['d', 'test-rsvp']],
        content: ''
      };

      const startTime = getEventStartTime(rsvpEvent);
      expect(startTime).toBeNull();
    });
  });
});