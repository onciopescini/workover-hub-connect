/**
 * Public Spaces Business Logic Hook
 * 
 * Extracted from PublicSpaces.tsx to separate concerns and improve maintainability.
 * Handles filters, location, and data fetching logic.
 */
import { useState, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLocationParams } from '@/hooks/useLocationParams';
import { useMapCardInteraction } from '@/hooks/useMapCardInteraction';
import { useMapboxGeocoding } from '@/hooks/useMapboxGeocoding';
import { useErrorHandler } from '@/hooks/useErrorHandler';
import { useLogger } from '@/hooks/useLogger';
import { TIME_CONSTANTS } from "@/constants";

/**
 * Campi realmente esposti dalla view spaces_public_safe
 */
const PUBLIC_SPACES_SELECT = [
  'id',
  'title', 
  'description',
  'category',
  'work_environment',
  'max_capacity',
  'confirmation_type',
  'workspace_features',
  'amenities',
  'seating_types',        // ARRAY
  'ideal_guest_tags',     // ARRAY
  'event_friendly_tags',
  'price_per_hour',
  'price_per_day',
  'photos',
  'rules',
  'availability',
  'cancellation_policy',
  'city_name',
  'country_code',
  'approximate_location', // tipo POINT (x=lng, y=lat)
  'published',
  'created_at',
  'updated_at'
].join(', ');

/**
 * Parse Postgres POINT type to lat/lng
 * Supabase returns POINT as string "(x,y)" where x=lng, y=lat
 * or as object {x: lng, y: lat}
 */
function parsePoint(p: unknown): { lat?: number; lng?: number } {
  if (!p) return {};
  
  // String format: "(lng,lat)" o "lng,lat"
  if (typeof p === 'string') {
    const match = p.match(/\(?\s*(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)\s*\)?/);
    if (match && match[1] && match[2]) {
      return { 
        lng: parseFloat(match[1]), 
        lat: parseFloat(match[2]) 
      };
    }
  }
  
  // Object format: {x: lng, y: lat}
  if (typeof p === 'object' && p !== null) {
    const { x, y } = p as any;
    if (typeof x === 'number' && typeof y === 'number') {
      return { lng: x, lat: y };
    }
  }
  
  return {};
}

/**
 * Normalize public space data for UI compatibility
 * - Derives latitude/longitude from approximate_location
 * - Constructs address from city_name + country_code
 * - Converts arrays to singular for backward compatibility
 */
function normalizePublicSpace(raw: any): any {
  const { lat, lng } = parsePoint(raw.approximate_location);
  
  return {
    ...raw,
    // Derived fields for UI compatibility
    latitude: lat ?? null,
    longitude: lng ?? null,
    address: [raw.city_name, raw.country_code].filter(Boolean).join(', ') || '',
    
    // Backward compatibility: singular from array
    seating_type: Array.isArray(raw.seating_types) && raw.seating_types.length > 0 
      ? raw.seating_types[0] 
      : null,
    ideal_guest: Array.isArray(raw.ideal_guest_tags) && raw.ideal_guest_tags.length > 0 
      ? raw.ideal_guest_tags[0] 
      : null,
  };
}

/**
 * Optimized batch check availability for multiple spaces using RPC
 * Features: chunking, parallel requests, retry logic, performance monitoring
 */
const BATCH_SIZE = 50;
const MAX_RETRIES = 2;

const checkSpacesAvailabilityBatch = async (
  spaceIds: string[],
  date: Date,
  startTime: string,
  endTime: string
): Promise<Record<string, { isAvailable: boolean; availableSpots: number; maxCapacity: number }>> => {
  // Split into chunks to prevent timeout
  const chunks: string[][] = [];
  for (let i = 0; i < spaceIds.length; i += BATCH_SIZE) {
    chunks.push(spaceIds.slice(i, i + BATCH_SIZE));
  }
  
  const { info, warn, error } = { 
    info: (msg: string, ctx?: any) => console.log(msg, ctx),
    warn: (msg: string, ctx?: any) => console.warn(msg, ctx),
    error: (msg: string, ctx?: any) => console.error(msg, ctx)
  };
  
  info('Batch availability check started', {
    totalSpaces: spaceIds.length,
    chunksCount: chunks.length,
    batchSize: BATCH_SIZE
  });
  
  const dateStr = date.toISOString().split('T')[0] || '';
  
  // Process chunks in parallel with retry
  const chunkPromises = chunks.map(async (chunk, index) => {
    let retries = 0;
    
    while (retries <= MAX_RETRIES) {
      try {
        const startTime = performance.now();
        
        const { data, error: rpcError } = await supabase.rpc('get_spaces_availability_batch', {
          space_ids: chunk,
          check_date: dateStr,
          check_start_time: startTime as any, // Type coercion needed due to function signature
          check_end_time: endTime as any
        });
        
        const duration = performance.now() - startTime;
        
        if (rpcError) throw rpcError;
        
        if (duration > 1000) {
          warn('Slow availability chunk detected', {
            chunkIndex: index,
            duration,
            chunkSize: chunk.length
          });
        }
        
        return data;
        
      } catch (err) {
        retries++;
        if (retries > MAX_RETRIES) {
          error('Availability check chunk failed after retries', {
            chunkIndex: index,
            attempts: retries,
            error: err
          });
          return [];
        }
        
        // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, 1000 * retries));
      }
    }
    
    return [];
  });
  
  const results = await Promise.allSettled(chunkPromises);
  
  // Merge results
  const availabilityMap: Record<string, { isAvailable: boolean; availableSpots: number; maxCapacity: number }> = {};
  let successfulChunks = 0;
  
  results.forEach((result, index) => {
    if (result.status === 'fulfilled' && result.value) {
      result.value.forEach((item: any) => {
        availabilityMap[item.space_id] = {
          isAvailable: item.available_capacity > 0,
          availableSpots: item.available_capacity,
          maxCapacity: item.max_capacity
        };
      });
      successfulChunks++;
    } else {
      warn('Chunk failed to load', { 
        chunkIndex: index,
        reason: result.status === 'rejected' ? result.reason : 'unknown'
      });
    }
  });
  
  info('Batch availability check complete', {
    totalRequested: spaceIds.length,
    totalFound: Object.keys(availabilityMap).length,
    successRate: `${Math.round((Object.keys(availabilityMap).length / spaceIds.length) * 100)}%`,
    successfulChunks: `${successfulChunks}/${chunks.length}`
  });
  
  return availabilityMap;
};

interface SpaceFilters {
  category: string;
  priceRange: [number, number];
  amenities: string[];
  workEnvironment: string;
  location: string;
  coordinates: { lat: number; lng: number } | null;
  capacity: [number, number];
  rating: number;
  verified: boolean;
  superhost: boolean;
  instantBook: boolean;
  startDate: Date | null;
  endDate: Date | null;
  startTime: string | null;
  endTime: string | null;
}

const DEFAULT_FILTERS: SpaceFilters = {
  category: '',
  priceRange: [0, 200],
  amenities: [],
  workEnvironment: '',
  location: '',
  coordinates: null,
  capacity: [1, 20],
  rating: 0,
  verified: false,
  superhost: false,
  instantBook: false,
  startDate: null,
  endDate: null,
  startTime: null,
  endTime: null
};

export const usePublicSpacesLogic = () => {
  const { initialCity, initialCoordinates, initialDate, initialStartTime, initialEndTime, updateLocationParam } = useLocationParams();
  const [filters, setFilters] = useState<SpaceFilters>(() => ({
    ...DEFAULT_FILTERS,
    location: initialCity || '',
    coordinates: initialCoordinates,
    startDate: initialDate,
    startTime: initialStartTime,
    endTime: initialEndTime
  }));
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(() => 
    initialCoordinates || { lat: 41.9028, lng: 12.4964 }
  );
  
  const { handleAsyncError } = useErrorHandler('PublicSpaces');
  const { warn, info } = useLogger({ context: 'usePublicSpacesLogic' });
  const { geocodeAddress } = useMapboxGeocoding();
  
  const mapInteraction = useMapCardInteraction();

  // Update filters when URL parameters change (from homepage navigation)
  useEffect(() => {
    if (initialCity || initialDate || initialStartTime || initialEndTime) {
      setFilters(prev => ({
        ...prev,
        location: initialCity || prev.location,
        coordinates: initialCoordinates || prev.coordinates,
        startDate: initialDate || prev.startDate,
        startTime: initialStartTime || prev.startTime,
        endTime: initialEndTime || prev.endTime
      }));
      
      if (initialCoordinates) {
        setUserLocation(initialCoordinates);
      }
    }
  }, [initialCity, initialCoordinates, initialDate, initialStartTime, initialEndTime]);

  // Memoized geocoding function to prevent re-renders
  const stableGeocodeAddress = useCallback(geocodeAddress, [geocodeAddress]);
  
  // Stable filter key for React Query to prevent unnecessary refetches
  const filterKey = JSON.stringify({
    category: filters.category,
    priceRange: filters.priceRange,
    workEnvironment: filters.workEnvironment,
    location: filters.location,
    capacity: filters.capacity,
    verified: filters.verified,
    superhost: filters.superhost,
    instantBook: filters.instantBook,
    startDate: filters.startDate?.toISOString(),
    endDate: filters.endDate?.toISOString(),
    startTime: filters.startTime,
    endTime: filters.endTime
  });

  // Debounced geocoding for city search
  useEffect(() => {
    if (!filters.location || filters.location.trim().length < 3) {
      return;
    }

    const timer = setTimeout(async () => {
      info('Starting geocoding for city', { city: filters.location });
      
        try {
        const results = await stableGeocodeAddress(filters.location);
        if (results.length > 0 && results[0]?.center) {
          const coordinates = {
            lat: results[0].center[1], // Mapbox returns [lng, lat]
            lng: results[0].center[0]
          };
          
          info('Geocoding successful', { city: filters.location, coordinates });
          
          // Update filters with coordinates
          setFilters(prev => ({ ...prev, coordinates }));
          
          // Update URL with city and coordinates
          updateLocationParam(filters.location, coordinates);
        }
      } catch (error) {
        warn('Geocoding failed', { city: filters.location, error });
        // If geocoding fails, still update URL with just the city name
        updateLocationParam(filters.location);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [filters.location, stableGeocodeAddress, updateLocationParam, info, warn]);

  // Spaces data fetching with React Query - optimized
  const spacesQuery = useQuery({
    queryKey: ['public-spaces', filterKey],
    queryFn: async () => {
      info('Fetching public spaces with filters', { filters });
      
      // Use secure view that doesn't expose host_id or precise location
      const { data: spacesData, error: spacesError } = await supabase
        .from('spaces_public_safe')
        .select(PUBLIC_SPACES_SELECT);
      
      if (spacesError) {
        info('Failed to fetch spaces', { error: spacesError });
        throw spacesError;
      }

      // Normalize data: derive lat/lng, address, and singular fields
      const normalizedSpaces = Array.isArray(spacesData) 
        ? spacesData.map(normalizePublicSpace) 
        : [];
      let filteredSpaces = normalizedSpaces;

      // Apply filters to the fetched data (client-side filtering)
      if (filters.category) {
        filteredSpaces = filteredSpaces.filter((space: any) => space && space.category === filters.category);
      }
      if (filters.workEnvironment) {
        filteredSpaces = filteredSpaces.filter((space: any) => 
          space && space.work_environment === filters.workEnvironment
        );
      }
      if (filters.priceRange[1] < 200) {
        filteredSpaces = filteredSpaces.filter((space: any) => 
          space && space.price_per_day <= filters.priceRange[1]
        );
      }
      if (filters.priceRange[0] > 0) {
        filteredSpaces = filteredSpaces.filter((space: any) => 
          space && space.price_per_day >= filters.priceRange[0]
        );
      }
      if (filters.capacity[1] < 20) {
        filteredSpaces = filteredSpaces.filter((space: any) => 
          space && space.max_capacity <= filters.capacity[1]
        );
      }
      if (filters.capacity[0] > 1) {
        filteredSpaces = filteredSpaces.filter((space: any) => 
          space && space.max_capacity >= filters.capacity[0]
        );
      }
      if (filters.location) {
        // Flexible city search: search in city_name, country_code AND derived address
        const searchTerm = filters.location.trim().toLowerCase();
        filteredSpaces = filteredSpaces.filter((space: any) => 
          space && (
            space.city_name?.toLowerCase().includes(searchTerm) ||
            space.country_code?.toLowerCase().includes(searchTerm) ||
            space.address?.toLowerCase().includes(searchTerm)
          )
        );
      }

      // Filter by availability (date/time range) with capacity check
      if (filters.startDate && filters.startTime && filters.endTime) {
        const spaceIds = filteredSpaces.map((space: any) => space.id);
        
        // Use batch RPC for efficient availability check
        const availabilityMap = await checkSpacesAvailabilityBatch(
          spaceIds,
          filters.startDate,
          filters.startTime,
          filters.endTime
        );
        
        // Filter spaces with available capacity
        filteredSpaces = filteredSpaces.filter((space: any) => {
          const availability = availabilityMap[space.id];
          return availability && availability.isAvailable;
        });
      }
      
      info(`Successfully fetched and filtered ${Array.isArray(filteredSpaces) ? filteredSpaces.length : 0} spaces`);
      return Array.isArray(filteredSpaces) ? filteredSpaces : [];
    },
    staleTime: TIME_CONSTANTS.CACHE_DURATION,
    gcTime: TIME_CONSTANTS.CACHE_DURATION * 2,
    refetchOnWindowFocus: false,
  });

  const handleFiltersChange = (newFilters: SpaceFilters) => {
    info('Filters changed', { previousFilters: filters, newFilters });
    setFilters(newFilters);
    mapInteraction.clearSelection();
  };

  const getUserLocation = async () => {
    if (!navigator.geolocation) {
      warn('Geolocation not supported, using default location (Rome)');
      return;
    }

    const locationResult = await handleAsyncError(
      () => new Promise<{lat: number, lng: number}>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          (position) => resolve({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          }),
          reject,
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 600000
          }
        );
      }),
      { 
        context: 'geolocation',
        showToast: false,
        toastMessage: 'Impossibile ottenere la posizione. Utilizzo Roma come default.'
      }
    );

    if (locationResult) {
      info('User location obtained successfully');
      setUserLocation(locationResult);
      setFilters(prev => ({ ...prev, coordinates: locationResult }));
    } else {
      warn('Geolocation failed, using default location (Rome)');
    }
  };

  // Use coordinates for map center if available
  const mapCenter = filters.coordinates || userLocation;

  return {
    // State
    filters,
    userLocation,
    mapCenter,
    
    // Data
    spaces: spacesQuery.data,
    isLoading: spacesQuery.isLoading,
    error: spacesQuery.error,
    
    // Actions
    handleFiltersChange,
    getUserLocation,
    
    // Map interaction
    ...mapInteraction
  };
};