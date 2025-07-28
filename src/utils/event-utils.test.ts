import { describe, it, expect } from 'vitest';
import { generateEventNaddr, getCalendarEventUrl } from './event-utils';
import { CalendarEvent } from '@/contexts/EventsContextTypes';

describe('event-utils', () => {
  describe('generateEventNaddr', () => {
    it('should generate naddr URL for valid calendar event', () => {
      const event: CalendarEvent = {
        id: 'test-id',
        kind: 31922,
        pubkey: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef', // Valid 64-char hex
        created_at: Date.now(),
        tags: [],
        content: '',
        dTag: 'event-identifier',
      };

      const result = generateEventNaddr(event);
      expect(result).toBeTruthy();
      expect(result).toMatch(/^\/events\/naddr1/);
    });

    it('should return null if dTag is missing', () => {
      const event: CalendarEvent = {
        id: 'test-id',
        kind: 31922,
        pubkey: 'pubkey123',
        created_at: Date.now(),
        tags: [],
        content: '',
      };

      const result = generateEventNaddr(event);
      expect(result).toBeNull();
    });

    it('should return null if pubkey is missing', () => {
      const event: CalendarEvent = {
        id: 'test-id',
        kind: 31922,
        pubkey: '',
        created_at: Date.now(),
        tags: [],
        content: '',
        dTag: 'event-identifier',
      };

      const result = generateEventNaddr(event);
      expect(result).toBeNull();
    });
  });

  describe('getCalendarEventUrl', () => {
    it('should return naddr URL when possible', () => {
      const event: CalendarEvent = {
        id: 'test-id',
        kind: 31923,
        pubkey: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef', // Valid 64-char hex
        created_at: Date.now(),
        tags: [],
        content: '',
        dTag: 'event-identifier',
      };

      const result = getCalendarEventUrl(event);
      expect(result).toMatch(/^\/events\/naddr1/);
    });

    it('should fall back to calendar ID URL when naddr fails', () => {
      const event: CalendarEvent = {
        id: 'test-id',
        kind: 31923,
        pubkey: '',
        created_at: Date.now(),
        tags: [],
        content: '',
      };

      const result = getCalendarEventUrl(event);
      expect(result).toBe('/calendar/test-id');
    });
  });
});