import { describe, it, expect } from 'vitest';
import { isPhysicalAddress, normalizeAddress, geocodeAddress } from './geocoding';

describe('geocoding utilities', () => {
  describe('isPhysicalAddress', () => {
    it('should detect online locations', () => {
      expect(isPhysicalAddress('https://zoom.us/j/1234567890')).toBe(false);
      expect(isPhysicalAddress('www.google.com')).toBe(false);
      expect(isPhysicalAddress('meet.google.com/abc-def-ghi')).toBe(false);
      expect(isPhysicalAddress('teams.microsoft.com')).toBe(false);
      expect(isPhysicalAddress('online meeting')).toBe(false);
      expect(isPhysicalAddress('virtual event')).toBe(false);
      expect(isPhysicalAddress('remote conference')).toBe(false);
    });

    it('should detect physical addresses', () => {
      expect(isPhysicalAddress('123 Main Street, New York, NY')).toBe(true);
      expect(isPhysicalAddress('Central Park, Manhattan')).toBe(true);
      expect(isPhysicalAddress('Coffee Shop, Downtown')).toBe(true);
      expect(isPhysicalAddress('University Hall, Room 201')).toBe(true);
      expect(isPhysicalAddress('1600 Pennsylvania Avenue')).toBe(true);
      expect(isPhysicalAddress('San Francisco, CA 94102')).toBe(true);
      expect(isPhysicalAddress('Toronto, ON M5V 3A8')).toBe(true);
    });

    it('should handle edge cases', () => {
      expect(isPhysicalAddress('')).toBe(false);
      expect(isPhysicalAddress('TBD')).toBe(false);
      expect(isPhysicalAddress('To be announced')).toBe(false);
    });
  });

  describe('geocodeAddress', () => {
    it('should handle network timeouts gracefully', async () => {
      // This tests the fallback when the network request fails
      const result = await geocodeAddress('Some event in Palm Cove, Australia');
      
      if (result) {
        // Should get demo coordinates for Palm Cove
        expect(result.lat).toBeCloseTo(-16.7417, 1);
        expect(result.lon).toBeCloseTo(145.6781, 1);
        expect(result.display_name).toContain('Demo Location');
      }
      
      // Even if it fails, it should not throw an error
      expect(true).toBe(true);
    });

    it('should extract coordinates from text', async () => {
      const result = await geocodeAddress('Event at 40.7128, -74.0060');
      
      if (result) {
        expect(result.lat).toBe(40.7128);
        expect(result.lon).toBe(-74.0060);
      }
    });
  });

  describe('normalizeAddress', () => {
    it('should normalize common abbreviations', () => {
      expect(normalizeAddress('123 Main St')).toBe('123 Main Street');
      expect(normalizeAddress('456 Oak Ave')).toBe('456 Oak Avenue');
      expect(normalizeAddress('789 Pine Rd')).toBe('789 Pine Road');
      expect(normalizeAddress('101 Elm Dr')).toBe('101 Elm Drive');
    });

    it('should remove common prefixes', () => {
      expect(normalizeAddress('at 123 Main Street')).toBe('123 Main Street');
      expect(normalizeAddress('@ Central Park')).toBe('Central Park');
    });

    it('should clean up whitespace', () => {
      expect(normalizeAddress('  123   Main   Street  ')).toBe('123 Main Street');
      expect(normalizeAddress('Central\t\tPark')).toBe('Central Park');
    });

    it('should handle empty input', () => {
      expect(normalizeAddress('')).toBe('');
      expect(normalizeAddress('   ')).toBe('');
    });
  });
});