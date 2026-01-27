/**
 * Mapbox Service Layer
 * 
 * Gestisce geocoding e ricerca indirizzi con token management e caching.
 */

import { supabase } from '@/integrations/supabase/client';
import { sreLogger } from '@/lib/sre-logger';

// ============= TYPES =============

export interface AddressSuggestion {
  id: string;
  place_name: string;
  center: [number, number]; // [longitude, latitude]
  text: string;
  place_type: string[];
  bbox?: [number, number, number, number];
}

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface GeocodeResult {
  success: boolean;
  suggestions?: AddressSuggestion[];
  error?: string;
}

export interface ReverseGeocodeResult {
  success: boolean;
  placeName?: string;
  error?: string;
}

export interface SearchAddressOptions {
  country?: string;
  types?: string;
  limit?: number;
  language?: string;
}

// ============= TOKEN MANAGEMENT =============

let cachedToken: string | null = null;
let tokenExpiry: number = 0;
const TOKEN_CACHE_DURATION = 3600000; // 1 hour in ms

/**
 * Get Mapbox token with caching to reduce Edge Function calls.
 */
export async function getMapboxToken(): Promise<string | null> {
  // Return cached token if valid
  if (cachedToken && Date.now() < tokenExpiry) {
    return cachedToken;
  }
  
  try {
    const { data, error } = await supabase.functions.invoke('get-mapbox-token');
    
    if (error || !data?.token) {
      sreLogger.error('Failed to fetch Mapbox token', { component: 'mapboxService' }, error as Error);
      return null;
    }
    
    // Validate token format
    if (typeof data.token !== 'string' || data.token.length === 0) {
      sreLogger.error('Invalid Mapbox token format', { component: 'mapboxService' });
      return null;
    }
    
    cachedToken = data.token;
    tokenExpiry = Date.now() + TOKEN_CACHE_DURATION;
    
    sreLogger.info('Mapbox token fetched and cached', { component: 'mapboxService' });
    return cachedToken;
  } catch (err) {
    sreLogger.error('Exception fetching Mapbox token', { component: 'mapboxService' }, err as Error);
    return null;
  }
}

/**
 * Clear the cached token (useful for testing or token refresh).
 */
export function clearTokenCache(): void {
  cachedToken = null;
  tokenExpiry = 0;
}

// ============= GEOCODING METHODS =============

/**
 * Search addresses with autocomplete.
 * @param query - Search string (min 3 chars)
 * @param options - Search options (country, types, limit)
 */
export async function searchAddresses(
  query: string,
  options?: SearchAddressOptions
): Promise<GeocodeResult> {
  if (!query || query.trim().length < 3) {
    return { success: true, suggestions: [] };
  }
  
  const token = await getMapboxToken();
  if (!token) {
    return { success: false, error: 'Token Mapbox non disponibile' };
  }
  
  const { 
    country = 'IT', 
    types = 'address,poi', 
    limit = 5, 
    language = 'it' 
  } = options || {};
  
  try {
    const url = new URL(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json`);
    url.searchParams.set('access_token', token);
    url.searchParams.set('country', country);
    url.searchParams.set('types', types);
    url.searchParams.set('limit', String(limit));
    url.searchParams.set('language', language);
    
    const response = await fetch(url.toString());
    
    if (!response.ok) {
      throw new Error(`Mapbox API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    return {
      success: true,
      suggestions: data.features || []
    };
  } catch (err) {
    sreLogger.error('Address search failed', { component: 'mapboxService', query }, err as Error);
    return { success: false, error: 'Errore nella ricerca indirizzi' };
  }
}

/**
 * Get coordinates from address (forward geocoding).
 * Returns first match coordinates or null if not found.
 */
export async function getCoordinates(address: string): Promise<Coordinates | null> {
  const result = await searchAddresses(address, { limit: 1 });
  
  if (!result.success || !result.suggestions?.length) {
    return null;
  }
  
  const firstSuggestion = result.suggestions[0];
  if (!firstSuggestion) {
    return null;
  }
  
  return {
    lat: firstSuggestion.center[1],
    lng: firstSuggestion.center[0]
  };
}

/**
 * Get address from coordinates (reverse geocoding).
 */
export async function reverseGeocode(lng: number, lat: number): Promise<ReverseGeocodeResult> {
  const token = await getMapboxToken();
  if (!token) {
    return { success: false, error: 'Token Mapbox non disponibile' };
  }
  
  try {
    const url = new URL(`https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json`);
    url.searchParams.set('access_token', token);
    url.searchParams.set('types', 'place,locality');
    url.searchParams.set('language', 'it');
    url.searchParams.set('limit', '1');
    
    const response = await fetch(url.toString());
    
    if (!response.ok) {
      throw new Error(`Mapbox API error: ${response.status}`);
    }
    
    const data = await response.json();
    const placeName = data.features?.[0]?.place_name || 'Posizione sconosciuta';
    
    return { success: true, placeName };
  } catch (err) {
    sreLogger.error('Reverse geocode failed', { component: 'mapboxService', lng, lat }, err as Error);
    return { success: false, error: 'Errore nella ricerca posizione' };
  }
}
