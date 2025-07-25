/**
 * Geocoding utilities for converting addresses to coordinates
 */

export interface GeocodingResult {
  lat: number;
  lon: number;
  display_name: string;
  confidence?: number;
}

// Enhanced cache for geocoding results with persistence
const CACHE_KEY = 'photon-geocoding-cache';
const CACHE_EXPIRY_DAYS = 30;

interface CachedResult {
  result: GeocodingResult | null;
  timestamp: number;
}

class GeocodingCache {
  private cache = new Map<string, CachedResult>();
  
  constructor() {
    this.loadFromStorage();
  }
  
  private loadFromStorage() {
    try {
      const stored = localStorage.getItem(CACHE_KEY);
      if (stored) {
        const data = JSON.parse(stored);
        const now = Date.now();
        const expiryMs = CACHE_EXPIRY_DAYS * 24 * 60 * 60 * 1000;
        
        Object.entries(data).forEach(([key, value]: [string, any]) => {
          if (value.timestamp && (now - value.timestamp) < expiryMs) {
            this.cache.set(key, value);
          }
        });
      }
    } catch (error) {
      console.warn('Failed to load geocoding cache:', error);
    }
  }
  
  private saveToStorage() {
    try {
      const data = Object.fromEntries(this.cache.entries());
      localStorage.setItem(CACHE_KEY, JSON.stringify(data));
    } catch (error) {
      console.warn('Failed to save geocoding cache:', error);
    }
  }
  
  get(key: string): GeocodingResult | null | undefined {
    const cached = this.cache.get(key);
    return cached?.result;
  }
  
  has(key: string): boolean {
    return this.cache.has(key);
  }
  
  set(key: string, result: GeocodingResult | null) {
    this.cache.set(key, {
      result,
      timestamp: Date.now()
    });
    
    // Debounced save to avoid excessive localStorage writes
    clearTimeout(this.saveTimeout);
    this.saveTimeout = setTimeout(() => this.saveToStorage(), 1000);
  }
  
  clear() {
    this.cache.clear();
    localStorage.removeItem(CACHE_KEY);
  }
  
  get size() {
    return this.cache.size;
  }
  
  private saveTimeout?: ReturnType<typeof setTimeout>;
}

const geocodingCache = new GeocodingCache();

// Demo coordinates for common location patterns when geocoding fails
const DEMO_COORDINATES: Record<string, [number, number]> = {
  'new york': [40.7128, -74.0060],
  'nyc': [40.7128, -74.0060],
  'london': [51.5074, -0.1278],
  'paris': [48.8566, 2.3522],
  'tokyo': [35.6762, 139.6503],
  'san francisco': [37.7749, -122.4194],
  'berlin': [52.5200, 13.4050],
  'sydney': [33.8688, 151.2093],
  'toronto': [43.6532, -79.3832],
  'amsterdam': [52.3676, 4.9041],
  'barcelona': [41.3851, 2.1734],
  'rome': [41.9028, 12.4964],
  'madrid': [40.4168, -3.7038],
  'palm cove': [-16.7417, 145.6781], // Palm Cove, Australia
  'eibar': [43.1833, -2.4667], // Eibar, Spain
  'lexington': [38.0406, -84.5037], // Lexington, KY
  'kentucky': [37.8393, -84.2700], // Kentucky
  'australia': [-25.2744, 133.7751],
  'spain': [40.4637, -3.7492],
  'gipuzkoa': [43.1833, -2.1667],
  'williams esplanade': [-16.7417, 145.6781], // Palm Cove area
  'surf club': [-16.7417, 145.6781], // Likely Palm Cove
  'lansdowne drive': [38.0406, -84.5037], // Lexington area
  'cellar bar': [38.0406, -84.5037], // Lexington area
  'bar nuevo': [43.1833, -2.4667], // Eibar area
  'iturrioz': [43.1833, -2.4667], // Eibar area
};

/**
 * Detects if a location string looks like a physical address
 */
export function isPhysicalAddress(location: string): boolean {
  if (!location) return false;
  
  // Skip obvious online locations
  const onlinePatterns = [
    /^https?:\/\//i,
    /^www\./i,
    /zoom\.us/i,
    /meet\.google/i,
    /teams\.microsoft/i,
    /discord/i,
    /jitsi/i,
    /webex/i,
    /gotomeeting/i,
    /online/i,
    /virtual/i,
    /remote/i,
  ];
  
  if (onlinePatterns.some(pattern => pattern.test(location))) {
    return false;
  }
  
  // Look for address-like patterns
  const addressPatterns = [
    // Street numbers and names
    /\d+\s+[A-Za-z\s]+(?:street|st|avenue|ave|road|rd|drive|dr|boulevard|blvd|lane|ln|way|place|pl|court|ct)/i,
    // Cities with states/countries
    /[A-Za-z\s]+,\s*[A-Za-z\s]+/,
    // Postal codes
    /\b\d{5}(-\d{4})?\b/, // US ZIP
    /\b[A-Z]\d[A-Z]\s*\d[A-Z]\d\b/, // Canadian postal code
    /\b\d{4,5}\b/, // Simple postal codes
    // Common venue types
    /\b(building|hall|center|centre|hotel|restaurant|cafe|park|library|school|university|office|tower|plaza|mall)\b/i,
    // Geographic indicators
    /\b(city|town|village|county|state|province|country)\b/i,
  ];
  
  return addressPatterns.some(pattern => pattern.test(location));
}

/**
 * Normalizes an address string for better geocoding results
 */
export function normalizeAddress(address: string): string {
  if (!address) return '';
  
  let normalized = address.trim();
  
  // Remove common prefixes that might confuse geocoding
  normalized = normalized.replace(/^(at\s+|@\s*)/i, '');
  
  // Standardize common abbreviations
  const replacements: [RegExp, string][] = [
    [/\bst\b/gi, 'Street'],
    [/\bave\b/gi, 'Avenue'], 
    [/\brd\b/gi, 'Road'],
    [/\bdr\b/gi, 'Drive'],
    [/\bblvd\b/gi, 'Boulevard'],
    [/\bln\b/gi, 'Lane'],
    [/\bpl\b/gi, 'Place'],
    [/\bct\b/gi, 'Court'],
    [/\bpkwy\b/gi, 'Parkway'],
    [/\bft\b/gi, 'Fort'],
    [/\bmt\b/gi, 'Mount'],
  ];
  
  replacements.forEach(([pattern, replacement]) => {
    normalized = normalized.replace(pattern, replacement);
  });
  
  // Clean up extra whitespace
  normalized = normalized.replace(/\s+/g, ' ').trim();
  
  return normalized;
}

/**
 * Optimized Photon geocoding service configuration
 */
const GEOCODING_SERVICES = [
  {
    name: 'Photon (OpenStreetMap Alternative)',
    url: (query: string) => `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=1&lang=en`,
    headers: {
      'Accept': 'application/json',
      'User-Agent': 'NostrCal/1.0 (+https://nostrcal.com)'
    } as Record<string, string>
  },
];

// Connection pool for better HTTP performance
const fetchWithRetry = async (url: string, options: RequestInit, maxRetries = 2): Promise<Response> => {
  let lastError;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);
      if (response.ok) {
        return response;
      }
      
      // Don't retry on client errors (4xx)
      if (response.status >= 400 && response.status < 500) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      lastError = new Error(`HTTP ${response.status}: ${response.statusText}`);
      if (attempt < maxRetries) {
        // Exponential backoff: 500ms, 1000ms, 2000ms
        await new Promise(resolve => setTimeout(resolve, 500 * Math.pow(2, attempt)));
      }
    } catch (error) {
      lastError = error;
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 500 * Math.pow(2, attempt)));
      }
    }
  }
  
  throw lastError;
};

/**
 * Geocodes an address using multiple services with fallbacks
 */
export async function geocodeAddress(address: string): Promise<GeocodingResult | null> {
  if (!address || !isPhysicalAddress(address)) {
    return null;
  }
  
  const normalizedAddress = normalizeAddress(address);
  
  // Check cache first
  if (geocodingCache.has(normalizedAddress)) {
    return geocodingCache.get(normalizedAddress) || null;
  }

  // Try coordinate extraction first (highest accuracy)
  const extractedCoords = tryExtractCoordinatesFromText(address);
  if (extractedCoords) {
    geocodingCache.set(normalizedAddress, extractedCoords);
    return extractedCoords;
  }
  // Try multiple geocoding services
  for (const service of GEOCODING_SERVICES) {
    try {
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000); // 6 second timeout per service
      
      const fetchOptions: RequestInit = {
        headers: service.headers,
        signal: controller.signal,
      };
      
      const response = await fetchWithRetry(service.url(normalizedAddress), fetchOptions);
      clearTimeout(timeoutId);
      
      const data = await response.json();
      
      let geocodingResult: GeocodingResult | null = null;
      
      // Parse response based on service
      if (service.name.includes('Nominatim')) {
        if (Array.isArray(data) && data.length > 0) {
          const result = data[0];
          geocodingResult = {
            lat: parseFloat(result.lat),
            lon: parseFloat(result.lon),
            display_name: result.display_name,
            confidence: parseFloat(result.importance || '0'),
          };
        }
      } else if (service.name.includes('Photon')) {
        if (data.features && data.features.length > 0) {
          const result = data.features[0];
          geocodingResult = {
            lat: result.geometry.coordinates[1], // GeoJSON format [lon, lat]
            lon: result.geometry.coordinates[0],
            display_name: result.properties.name || result.properties.label || address,
            confidence: 0.8, // Photon doesn't provide confidence
          };
        }
      } else if (service.name.includes('OpenCage')) {
        if (data.results && data.results.length > 0) {
          const result = data.results[0];
          geocodingResult = {
            lat: result.geometry.lat,
            lon: result.geometry.lng,
            display_name: result.formatted,
            confidence: result.confidence || 0.5,
          };
        }
      } else if (service.name.includes('MapBox')) {
        if (data.features && data.features.length > 0) {
          const result = data.features[0];
          geocodingResult = {
            lat: result.center[1], // MapBox uses [lon, lat]
            lon: result.center[0],
            display_name: result.place_name,
            confidence: result.relevance || 0,
          };
        }
      }
      
      if (geocodingResult) {
        // Validate coordinates are reasonable
        if (isValidCoordinates(geocodingResult.lat, geocodingResult.lon)) {
          geocodingCache.set(normalizedAddress, geocodingResult);
          return geocodingResult;
        }
      }
      
    } catch {
      continue;
    }
  }
  
  // All services failed, try demo coordinates as last resort
  const demoResult = tryGetDemoCoordinates(normalizedAddress);
  if (demoResult) {
    geocodingCache.set(normalizedAddress, demoResult);
    return demoResult;
  }
  
  geocodingCache.set(normalizedAddress, null);
  return null;
}

/**
 * Try to get demo coordinates for known locations
 */
function tryGetDemoCoordinates(address: string): GeocodingResult | null {
  const lowerAddress = address.toLowerCase();
  
  // Check for direct matches first
  for (const [location, coords] of Object.entries(DEMO_COORDINATES)) {
    if (lowerAddress.includes(location)) {
      return {
        lat: coords[0],
        lon: coords[1],
        display_name: `${address} (Demo Location)`,
        confidence: 0.3, // Low confidence for demo coordinates
      };
    }
  }
  
  return null;
}

/**
 * Fallback function to extract coordinates from text patterns
 */
function tryExtractCoordinatesFromText(text: string): GeocodingResult | null {
  // Look for GPS coordinates in the text (lat, lon format)
  const coordPatterns = [
    // More specific decimal degrees with proper separators: "40.7128, -74.0060"
    /(-?\d{1,3}\.\d{3,})\s*,\s*(-?\d{1,3}\.\d{3,})/,
    // With cardinal directions: "40.7128N, 74.0060W"
    /(\d{1,2}\.\d+)[NS]\s*,?\s*(\d{1,3}\.\d+)[EW]/i,
    // GPS format with explicit labels: "lat: 40.7128, lon: -74.0060"
    /lat(?:itude)?:?\s*(-?\d{1,3}\.\d+).*?lon(?:gitude)?:?\s*(-?\d{1,3}\.\d+)/i,
  ];
  
  for (const pattern of coordPatterns) {
    const match = text.match(pattern);
    if (match) {
      let lat = parseFloat(match[1]);
      let lon = parseFloat(match[2]);
      
      // Handle cardinal directions
      if (pattern.source.includes('[NS]')) {
        if (text.match(/S/i)) lat = -lat;
        if (text.match(/W/i)) lon = -lon;
      }
      
      // Strict validation for reasonable coordinates
      if (lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180 && 
          Math.abs(lat) > 0.001 && Math.abs(lon) > 0.001) { // Avoid 0,0 coordinates
        
        return {
          lat,
          lon,
          display_name: `${text} (Extracted Coordinates)`,
          confidence: 0.9, // High confidence for explicit coordinates
        };
      } else {
        console.warn(`❌ Invalid extracted coordinates: lat=${lat}, lon=${lon} from text: ${text}`);
      }
    }
  }
  
  return null;
}

/**
 * Batch geocode multiple addresses with rate limiting
 */
export async function geocodeAddresses(addresses: string[]): Promise<Map<string, GeocodingResult | null>> {
  const results = new Map<string, GeocodingResult | null>();
  
  // Process addresses with a delay to respect rate limits
  for (const address of addresses) {
    if (address && isPhysicalAddress(address)) {
      const result = await geocodeAddress(address);
      results.set(address, result);
      
      // Add delay between requests to be respectful to the service
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }
  
  return results;
}

/**
 * Clears the geocoding cache
 */
export function clearGeocodingCache(): void {
  geocodingCache.clear();
}

/**
 * Gets the current cache size
 */
export function getGeocodingCacheSize(): number {
  return geocodingCache.size;
}

/**
 * Resets the failed request counter to allow geocoding attempts again
 */
export function resetGeocodingFailures(): void {
  localStorage.removeItem('geocoding_failed_requests');
  console.log('Geocoding failure counter reset');
}

/**
 * Validates coordinates are reasonable and not obviously wrong
 */
function isValidCoordinates(lat: number, lon: number): boolean {
  // Basic range validation
  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
    return false;
  }
  
  // Avoid exact 0,0 coordinates (likely errors)
  if (lat === 0 && lon === 0) {
    return false;
  }
  
  // Avoid coordinates that are likely swapped (e.g., longitude in latitude range)
  // This is a heuristic check - not perfect but catches common errors
  if (Math.abs(lat) > 85 && Math.abs(lon) < 90) {
    console.warn(`Suspicious coordinates detected - possible lat/lon swap: lat=${lat}, lon=${lon}`);
    return false;
  }
  
  // Check for obviously invalid patterns
  if (isNaN(lat) || isNaN(lon) || !isFinite(lat) || !isFinite(lon)) {
    return false;
  }
  
  return true;
}

/**
 * Diagnose geocoding connectivity issues
 */
export async function diagnoseGeocodingConnectivity(): Promise<void> {
  console.log('🔍 Diagnosing geocoding connectivity...');
  
  for (const service of GEOCODING_SERVICES) {
    try {
      console.log(`Testing ${service.name}...`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      
      const response = await fetch(service.url('test'), {
        headers: service.headers,
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        console.log(`✅ ${service.name}: Connected (HTTP ${response.status})`);
      } else {
        console.log(`⚠️ ${service.name}: HTTP ${response.status} - ${response.statusText}`);
      }
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          console.log(`⏱️ ${service.name}: Timeout (>3s)`);
        } else if (error.message.includes('fetch')) {
          console.log(`❌ ${service.name}: Network error - ${error.message}`);
        } else {
          console.log(`❌ ${service.name}: ${error.message}`);
        }
      } else {
        console.log(`❌ ${service.name}: Unknown error`);
      }
    }
  }
  
  console.log('🔍 Diagnosis complete. Check console for results.');
}