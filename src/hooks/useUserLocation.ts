import { useState, useEffect } from 'react';

interface UserLocation {
  lat: number;
  lng: number;
}

interface UseUserLocationResult {
  userLocation: UserLocation | null;
  locationError: string | null;
  isLoadingLocation: boolean;
}

/**
 * Hook to get user's approximate location for map centering
 * Falls back to reasonable defaults if geolocation fails or is denied
 */
export function useUserLocation(): UseUserLocationResult {
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isLoadingLocation, setIsLoadingLocation] = useState(true);

  useEffect(() => {
    // Check if geolocation is supported
    if (!navigator.geolocation) {
      setLocationError('Geolocation not supported');
      setUserLocation(getDefaultLocation());
      setIsLoadingLocation(false);
      return;
    }

    // Set timeout for geolocation request
    const timeoutId = setTimeout(() => {
      setLocationError('Location request timed out');
      setUserLocation(getDefaultLocation());
      setIsLoadingLocation(false);
    }, 5000); // 5 second timeout

    // Request user's location
    navigator.geolocation.getCurrentPosition(
      (position) => {
        clearTimeout(timeoutId);
        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });
        setLocationError(null);
        setIsLoadingLocation(false);
      },
      (error) => {
        clearTimeout(timeoutId);
        let errorMessage = 'Location access denied';
        
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Location access denied by user';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Location information unavailable';
            break;
          case error.TIMEOUT:
            errorMessage = 'Location request timed out';
            break;
          default:
            errorMessage = 'Unknown location error';
            break;
        }
        
        setLocationError(errorMessage);
        setUserLocation(getDefaultLocation());
        setIsLoadingLocation(false);
      },
      {
        enableHighAccuracy: false, // Faster, less battery intensive
        timeout: 4000, // 4 second timeout
        maximumAge: 300000 // Accept 5-minute old cached location
      }
    );

    return () => {
      clearTimeout(timeoutId);
    };
  }, []);

  return {
    userLocation,
    locationError,
    isLoadingLocation
  };
}

/**
 * Get a reasonable default location based on various factors
 * Falls back to major cities or world center
 */
function getDefaultLocation(): UserLocation {
  // Try to guess location from timezone
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  
  // Common timezone to location mappings
  const timezoneDefaults: Record<string, UserLocation> = {
    // North America
    'America/New_York': { lat: 40.7128, lng: -74.0060 }, // NYC
    'America/Los_Angeles': { lat: 34.0522, lng: -118.2437 }, // LA
    'America/Chicago': { lat: 41.8781, lng: -87.6298 }, // Chicago
    'America/Denver': { lat: 39.7392, lng: -104.9903 }, // Denver
    'America/Phoenix': { lat: 33.4484, lng: -112.0740 }, // Phoenix
    'America/Toronto': { lat: 43.6532, lng: -79.3832 }, // Toronto
    'America/Vancouver': { lat: 49.2827, lng: -123.1207 }, // Vancouver
    
    // Europe
    'Europe/London': { lat: 51.5074, lng: -0.1278 }, // London
    'Europe/Paris': { lat: 48.8566, lng: 2.3522 }, // Paris
    'Europe/Berlin': { lat: 52.5200, lng: 13.4050 }, // Berlin
    'Europe/Rome': { lat: 41.9028, lng: 12.4964 }, // Rome
    'Europe/Madrid': { lat: 40.4168, lng: -3.7038 }, // Madrid
    'Europe/Amsterdam': { lat: 52.3676, lng: 4.9041 }, // Amsterdam
    'Europe/Zurich': { lat: 47.3769, lng: 8.5417 }, // Zurich
    
    // Asia Pacific
    'Asia/Tokyo': { lat: 35.6762, lng: 139.6503 }, // Tokyo
    'Asia/Shanghai': { lat: 31.2304, lng: 121.4737 }, // Shanghai
    'Asia/Hong_Kong': { lat: 22.3193, lng: 114.1694 }, // Hong Kong
    'Asia/Singapore': { lat: 1.3521, lng: 103.8198 }, // Singapore
    'Australia/Sydney': { lat: -33.8688, lng: 151.2093 }, // Sydney
    'Australia/Melbourne': { lat: -37.8136, lng: 144.9631 }, // Melbourne
    
    // Other regions
    'Africa/Johannesburg': { lat: -26.2041, lng: 28.0473 }, // Johannesburg
    'America/Sao_Paulo': { lat: -23.5505, lng: -46.6333 }, // São Paulo
    'Asia/Dubai': { lat: 25.2048, lng: 55.2708 }, // Dubai
  };

  // Check if we have a mapping for the user's timezone
  if (timezone && timezoneDefaults[timezone]) {
    return timezoneDefaults[timezone];
  }

  // Try to guess by timezone prefix
  if (timezone) {
    if (timezone.startsWith('America/')) {
      return { lat: 39.8283, lng: -98.5795 }; // Center of USA
    } else if (timezone.startsWith('Europe/')) {
      return { lat: 50.1109, lng: 8.6821 }; // Center of Europe
    } else if (timezone.startsWith('Asia/')) {
      return { lat: 34.0479, lng: 100.6197 }; // Center of Asia
    } else if (timezone.startsWith('Australia/')) {
      return { lat: -25.2744, lng: 133.7751 }; // Center of Australia
    }
  }

  // Ultimate fallback - somewhere in the middle of major populated areas
  return { lat: 40.0, lng: 0.0 }; // Roughly between Europe and North Africa
}