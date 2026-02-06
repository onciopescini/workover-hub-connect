/**
 * Public Spaces Business Logic Hook
 * 
 * Extracted from PublicSpaces.tsx to separate concerns and improve maintainability.
 * Handles filters, location, and data fetching logic.
 */
import { useState, useEffect, useCallback, type Dispatch, type SetStateAction } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLocationParams } from '@/hooks/useLocationParams';
import { useMapCardInteraction } from '@/hooks/useMapCardInteraction';
import { useMapboxGeocoding } from '@/hooks/useMapboxGeocoding';
import { useErrorHandler } from '@/hooks/useErrorHandler';
import { useLogger } from '@/hooks/useLogger';
import { TIME_CONSTANTS } from "@/constants";
import { resolveSpaceFeatures } from "@/lib/space-mappers";

type PointObject = { x: number; y: number };

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const isPointObject = (value: unknown): value is PointObject =>
  isRecord(value) && typeof value['x'] === 'number' && typeof value['y'] === 'number';

/**
 * Helper to compare coordinates by value, not reference.
 * Prevents infinite loops from new object references with identical values.
 */
const areCoordinatesEqual = (
  a: { lat: number; lng: number } | null,
  b: { lat: number; lng: number } | null
): boolean => {
  if (a === null && b === null) return true;
  if (a === null || b === null) return false;
  return a.lat === b.lat && a.lng === b.lng;
};


// Field selection for direct spaces query (simulating the view structure)
const SPACES_SELECT = [
  'id',
  'title',
  'description',
  'category',
  'work_environment',
  'max_capacity',
  'confirmation_type',
  'amenities',
  'seating_types',
  'ideal_guest_tags',
  'event_friendly_tags',
  'price_per_hour',
  'price_per_day',
  'photos',
  'rules',
  'availability',
  'cancellation_policy',
  'city_name',
  'city:city_name',
  // 'country_code', // Default to 'IT'
  'latitude',
  'longitude',
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
  if (isPointObject(p)) {
    return { lng: p.x, lat: p.y };
  }
  
  return {};
}

/**
 * Normalize public space data for UI compatibility
 * - Derives latitude/longitude from approximate_location (or direct columns)
 * - Constructs address from city_name + country_code
 * - Converts arrays to singular for backward compatibility
 */
type NormalizedSpace = Record<string, unknown> & {
  id?: string;
  title?: string;
  name?: string;
  category?: string;
  work_environment?: string;
  max_capacity?: number | null;
  price_per_day?: number | null;
  price_per_hour?: number | null;
  city_name?: string;
  country_code?: string;
  latitude?: number | null;
  longitude?: number | null;
  address?: string;
  features?: string[];
  seating_types?: string[] | null;
  ideal_guest_tags?: string[] | null;
  seating_type?: string | null;
  ideal_guest?: string | null;
};

function normalizePublicSpace(raw: Record<string, unknown>): NormalizedSpace {
  // Handle both raw spaces data (with lat/lng) and view data (with approximate_location)
  let lat = typeof raw['latitude'] === 'number' ? raw['latitude'] : undefined;
  let lng = typeof raw['longitude'] === 'number' ? raw['longitude'] : undefined;

  if (raw['approximate_location'] && (lat === undefined || lng === undefined)) {
    const point = parsePoint(raw['approximate_location']);
    lat = point.lat;
    lng = point.lng;
  }
  
  const title = typeof raw['title'] === 'string' ? raw['title'] : undefined;
  const name = typeof raw['name'] === 'string' ? raw['name'] : undefined;
  const features = resolveSpaceFeatures(raw);
  const cityName = typeof raw['city_name'] === 'string' ? raw['city_name'] : undefined;
  const city = typeof raw['city'] === 'string' ? raw['city'] : undefined;
  const countryCode = typeof raw['country_code'] === 'string' ? raw['country_code'] : 'IT';

  const result: NormalizedSpace = {
    ...raw,
    title: title ?? name ?? '',
    features,
    city_name: cityName ?? city ?? '',
    country_code: countryCode,

    // Derived fields for UI compatibility
    latitude: lat ?? null,
    longitude: lng ?? null,
    address:
      (typeof raw['address'] === 'string' && raw['address']) ||
      [cityName ?? city, countryCode].filter(Boolean).join(', ') ||
      '',
    
    // Backward compatibility: singular from array
    seating_type: Array.isArray(raw['seating_types']) && raw['seating_types'].length > 0 
      ? raw['seating_types'][0] 
      : null,
    ideal_guest: Array.isArray(raw['ideal_guest_tags']) && raw['ideal_guest_tags'].length > 0 
      ? raw['ideal_guest_tags'][0] 
      : null,
  };
  return result;
}

/**
 * Optimized batch check availability for multiple spaces using RPC
 * Features: chunking, parallel requests, retry logic, performance monitoring
 */
const BATCH_SIZE = 50;
const MAX_RETRIES = 2;
const SPACES_PAGE_SIZE = 12;

type SpacesPage = {
  spaces: NormalizedSpace[];
  nextOffset: number | null;
};

type AvailabilityItem = {
  space_id: string;
  available_capacity: number;
  max_capacity: number;
};

const isAvailabilityItem = (value: unknown): value is AvailabilityItem =>
  isRecord(value) &&
  typeof value['space_id'] === 'string' &&
  typeof value['available_capacity'] === 'number' &&
  typeof value['max_capacity'] === 'number';

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
    info: (msg: string, ctx?: Record<string, unknown>) => { if (import.meta.env.DEV) console.log(msg, ctx) },
    warn: (msg: string, ctx?: Record<string, unknown>) => console.warn(msg, ctx),
    error: (msg: string, ctx?: Record<string, unknown>) => console.error(msg, ctx)
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
        const performanceStart = performance.now();
        
        const { data, error: rpcError } = await supabase.rpc('get_spaces_availability_batch', {
          space_ids: chunk,
          check_date: dateStr,
          check_start_time: startTime,
          check_end_time: endTime
        });
        
        const duration = performance.now() - performanceStart;
        
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
      const items = Array.isArray(result.value) ? result.value : [];
      items.forEach((item) => {
        if (!isAvailabilityItem(item)) {
          return;
        }

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

type MapInteractionState = ReturnType<typeof useMapCardInteraction>;

interface UsePublicSpacesLogicResult extends MapInteractionState {
  filters: SpaceFilters;
  userLocation: { lat: number; lng: number } | null;
  mapCenter: { lat: number; lng: number } | null;
  radiusKm: number;
  searchMode: 'text' | 'radius';
  spaces: NormalizedSpace[] | undefined;
  isLoading: boolean;
  isFetchingNextPage: boolean;
  hasNextPage: boolean;
  fetchNextPage: () => Promise<unknown>;
  error: unknown;
  handleFiltersChange: (newFilters: SpaceFilters) => void;
  handleRadiusChange: (newRadius: number) => void;
  setSearchMode: Dispatch<SetStateAction<'text' | 'radius'>>;
  getUserLocation: () => Promise<void>;
}

export const usePublicSpacesLogic = (): UsePublicSpacesLogicResult => {
  const {
    initialCity,
    initialCoordinates,
    initialRadius,
    initialDate,
    initialStartTime,
    initialEndTime,
    initialCategory,
    initialPriceRange,
    initialWorkEnvironment,
    initialMinCapacity,
    initialAmenities,
    updateLocationParam
  } = useLocationParams();

  const [filters, setFilters] = useState<SpaceFilters>(() => ({
    ...DEFAULT_FILTERS,
    location: initialCity || '',
    coordinates: initialCoordinates,
    startDate: initialDate,
    startTime: initialStartTime,
    endTime: initialEndTime,
    category: initialCategory,
    priceRange: initialPriceRange,
    workEnvironment: initialWorkEnvironment,
    amenities: initialAmenities,
    capacity: [initialMinCapacity, 20]
  }));

  const [radiusKm, setRadiusKm] = useState(initialRadius);
  const [searchMode, setSearchMode] = useState<'text' | 'radius'>(
    initialCoordinates ? 'radius' : 'text'
  );
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(() => 
    initialCoordinates || { lat: 41.9028, lng: 12.4964 }
  );
  
  const { handleAsyncError } = useErrorHandler('PublicSpaces');
  const { warn, info } = useLogger({ context: 'usePublicSpacesLogic' });
  const { geocodeAddress } = useMapboxGeocoding();
  
  const mapInteraction = useMapCardInteraction();

  // Update filters when URL parameters change (from homepage navigation)
  // Uses coordinate equality check to prevent infinite loops
  useEffect(() => {
    setFilters(prev => {
      // Check if coordinates actually changed by value
      const shouldUpdateCoords = !areCoordinatesEqual(initialCoordinates, prev.coordinates);
      
      // Skip update entirely if nothing changed
      const cityChanged = (initialCity || '') !== prev.location && initialCity !== '';
      const dateChanged = initialDate !== prev.startDate;
      const categoryChanged = initialCategory !== '' && initialCategory !== prev.category;
      
      if (!shouldUpdateCoords && !cityChanged && !dateChanged && !categoryChanged) {
        return prev; // Return previous state to prevent re-render
      }
      
      return {
        ...prev,
        location: initialCity || prev.location,
        coordinates: shouldUpdateCoords ? initialCoordinates : prev.coordinates,
        startDate: initialDate || prev.startDate,
        startTime: initialStartTime || prev.startTime,
        endTime: initialEndTime || prev.endTime,
        category: initialCategory || prev.category,
        priceRange: initialPriceRange,
        workEnvironment: initialWorkEnvironment || prev.workEnvironment,
        amenities: initialAmenities.length > 0 ? initialAmenities : prev.amenities,
        capacity: initialMinCapacity > 1 ? [initialMinCapacity, 20] : prev.capacity
      };
    });

    // Only update userLocation if coordinates actually changed
    if (initialCoordinates && !areCoordinatesEqual(initialCoordinates, userLocation)) {
      setUserLocation(initialCoordinates);
    }
  }, [initialCity, initialCoordinates, initialDate, initialStartTime, initialEndTime, initialCategory, initialWorkEnvironment, initialMinCapacity, userLocation]);

  // Sync state changes to URL - wrapped in useCallback for stability
  const syncFiltersToUrl = useCallback((newFilters: SpaceFilters, radius: number) => {
    updateLocationParam(
      newFilters.location,
      newFilters.coordinates || undefined,
      radius,
      {
        category: newFilters.category,
        priceRange: newFilters.priceRange,
        workEnvironment: newFilters.workEnvironment,
        amenities: newFilters.amenities,
        minCapacity: newFilters.capacity[0],
        date: newFilters.startDate,
        startTime: newFilters.startTime,
        endTime: newFilters.endTime
      }
    );
  }, [updateLocationParam]);

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
    endTime: filters.endTime,
    amenities: filters.amenities
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
          setFilters(prev => {
            const next = { ...prev, coordinates };
             syncFiltersToUrl(next, radiusKm);
            return next;
          });
          
        }
      } catch (error) {
        warn('Geocoding failed', { city: filters.location, error });
        // If geocoding fails, still update URL with just the city name
        syncFiltersToUrl(filters, radiusKm);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [filters.location, stableGeocodeAddress, info, warn]); // Removed updateLocationParam from dep to avoid loop

  // Spaces data fetching with React Query - optimized
  const spacesQuery = useInfiniteQuery<SpacesPage, Error>({
    queryKey: ['public-spaces', filterKey, searchMode, radiusKm],
    initialPageParam: 0,
    queryFn: async ({ pageParam }) => {
      const offset = typeof pageParam === 'number' ? pageParam : 0;
      info('Fetching public spaces with filters', { filters, searchMode, radiusKm });
      
      // NEW: Use geographic search RPC if coordinates available and in radius mode
      if (filters.coordinates && searchMode === 'radius') {
        try {
          info('Using geographic search by radius', { 
            coordinates: filters.coordinates, 
            radius: radiusKm 
          });
          
          const params: {
            p_lat: number;
            p_lng: number;
            p_radius_km: number;
            p_limit: number;
            p_category?: string;
            p_work_environment?: string;
            p_min_price?: number;
            p_max_price?: number;
            p_amenities?: string[];
            p_min_capacity?: number;
          } = {
            p_lat: filters.coordinates.lat,
            p_lng: filters.coordinates.lng,
            p_radius_km: radiusKm,
            p_limit: 100
          };
          
          // Add optional parameters only if they have values
          if (filters.category) params.p_category = filters.category;
          if (filters.workEnvironment) params.p_work_environment = filters.workEnvironment;
          if (filters.priceRange[0]) params.p_min_price = filters.priceRange[0];
          if (filters.priceRange[1] < 200) params.p_max_price = filters.priceRange[1];
          if (filters.amenities.length > 0) params.p_amenities = filters.amenities;
          if (filters.capacity[0] > 1) params.p_min_capacity = filters.capacity[0];
          
          const { data, error } = await supabase.rpc('search_spaces_by_radius', params);
          
          if (error) {
            // Log specific error and fall back to text search
            warn('Radius search failed, falling back to text search', {
              error: error.message,
              code: error.code,
              hint: error.hint
            });
            
            // FALLBACK: Switch to text search automatically
            setSearchMode('text');
            
            // If we have a location, the query will automatically retry with text search
            // because the query key changed when we updated searchMode
            throw error; // Let React Query handle the retry with new searchMode
          }
          
          info('Geographic search completed', {
            resultsCount: data?.length || 0,
            radius: radiusKm
          });
          
          const spaces = Array.isArray(data)
            ? data
                .slice(offset, offset + SPACES_PAGE_SIZE)
                .map((space) => (isRecord(space) ? normalizePublicSpace(space) : null))
                .filter((space): space is NormalizedSpace => space !== null)
            : [];

          return {
            spaces,
            nextOffset: spaces.length < SPACES_PAGE_SIZE ? null : offset + SPACES_PAGE_SIZE,
          };
        } catch (err) {
          // If radius search fails completely, switch to text search mode
          warn('Geographic search failed, switching to text search mode', {
            error: err
          });
          setSearchMode('text');
          throw err; // Let React Query handle the error
        }
      }
      
      // NEW: Use text search RPC if location provided
      if (filters.location) {
        info('Using text search by location', { location: filters.location });
        
        const params: {
          p_search_text: string;
          p_limit: number;
          p_category?: string;
          p_work_environment?: string;
          p_min_price?: number;
          p_max_price?: number;
          p_amenities?: string[];
          p_min_capacity?: number;
        } = {
          p_search_text: filters.location,
          p_limit: 100
        };
        
        // Add optional parameters only if they have values
        if (filters.category) params.p_category = filters.category;
        if (filters.workEnvironment) params.p_work_environment = filters.workEnvironment;
        if (filters.priceRange[0]) params.p_min_price = filters.priceRange[0];
        if (filters.priceRange[1] < 200) params.p_max_price = filters.priceRange[1];
        if (filters.amenities.length > 0) params.p_amenities = filters.amenities;
        if (filters.capacity[0] > 1) params.p_min_capacity = filters.capacity[0];
        
        const { data, error } = await supabase.rpc('search_spaces_by_location_text', params);
        
        if (error) throw error;
        
        info('Text search completed', {
          resultsCount: data?.length || 0,
          searchText: filters.location
        });
        
        const spaces = Array.isArray(data)
          ? data
              .slice(offset, offset + SPACES_PAGE_SIZE)
              .map((space) => (isRecord(space) ? normalizePublicSpace(space) : null))
              .filter((space): space is NormalizedSpace => space !== null)
          : [];

        return {
          spaces,
          nextOffset: spaces.length < SPACES_PAGE_SIZE ? null : offset + SPACES_PAGE_SIZE,
        };
      }
      
      // Fallback: Use standard query (fetch all from spaces + client-side filtering)
      info('Using standard query with client-side filtering (direct to spaces)');
      
      const { data: spacesData, error: spacesError } = await supabase
        .from('spaces')
        .select(SPACES_SELECT)
        .eq('published', true)
        .range(offset, offset + SPACES_PAGE_SIZE - 1);
      
      if (spacesError) {
        info('Failed to fetch spaces', { error: spacesError });
        throw spacesError;
      }

      // Normalize data: derive lat/lng, address, and singular fields
      const normalizedSpaces = Array.isArray(spacesData) 
        ? spacesData
            .map((space) => (isRecord(space) ? normalizePublicSpace(space) : null))
            .filter((space): space is NormalizedSpace => space !== null)
        : [];
      let filteredSpaces: NormalizedSpace[] = normalizedSpaces;

      // Apply filters to the fetched data (client-side filtering)
      if (filters.category) {
        filteredSpaces = filteredSpaces.filter((space) => space.category === filters.category);
      }
      if (filters.workEnvironment) {
        filteredSpaces = filteredSpaces.filter((space) => 
          space.work_environment === filters.workEnvironment
        );
      }
      if (filters.priceRange[1] < 200) {
        filteredSpaces = filteredSpaces.filter((space) => 
          typeof space.price_per_day === 'number' && space.price_per_day <= filters.priceRange[1]
        );
      }
      if (filters.priceRange[0] > 0) {
        filteredSpaces = filteredSpaces.filter((space) => 
          typeof space.price_per_day === 'number' && space.price_per_day >= filters.priceRange[0]
        );
      }
      if (filters.capacity[1] < 20) {
        filteredSpaces = filteredSpaces.filter((space) => 
          typeof space.max_capacity === 'number' && space.max_capacity <= filters.capacity[1]
        );
      }
      if (filters.capacity[0] > 1) {
        filteredSpaces = filteredSpaces.filter((space) => 
          typeof space.max_capacity === 'number' && space.max_capacity >= filters.capacity[0]
        );
      }
      if (filters.location) {
        // Flexible city search: search in city_name, country_code AND derived address
        const searchTerm = filters.location.trim().toLowerCase();
        filteredSpaces = filteredSpaces.filter((space) => 
          (
            (space.city_name || '').toLowerCase().includes(searchTerm) ||
            (space.country_code || '').toLowerCase().includes(searchTerm) ||
            (space.address || '').toLowerCase().includes(searchTerm)
          )
        );
      }

      // Filter by availability (date/time range) with capacity check
      if (filters.startDate && filters.startTime && filters.endTime) {
        const spaceIds = filteredSpaces.map((space) => space.id).filter((id): id is string => typeof id === 'string');
        
        // Use batch RPC for efficient availability check
        const availabilityMap = await checkSpacesAvailabilityBatch(
          spaceIds,
          filters.startDate,
          filters.startTime,
          filters.endTime
        );
        
        // Filter spaces with available capacity
        filteredSpaces = filteredSpaces.filter((space) => {
          if (!space.id) {
            return false;
          }
          const availability = availabilityMap[space.id];
          return availability && availability.isAvailable;
        });
      }
      
      const spaces = Array.isArray(filteredSpaces) ? filteredSpaces : [];
      info(`Successfully fetched and filtered ${spaces.length} spaces`);
      return {
        spaces,
        nextOffset: spaces.length < SPACES_PAGE_SIZE ? null : offset + SPACES_PAGE_SIZE,
      };
    },
    getNextPageParam: (lastPage) => lastPage.nextOffset,
    staleTime: TIME_CONSTANTS.CACHE_DURATION,
    gcTime: TIME_CONSTANTS.CACHE_DURATION * 2,
    refetchOnWindowFocus: false,
  });

  const flattenedSpaces = spacesQuery.data?.pages.flatMap((page) => page.spaces) ?? [];

  const handleFiltersChange = (newFilters: SpaceFilters) => {
    info('Filters changed', { previousFilters: filters, newFilters });
    setFilters(newFilters);
    mapInteraction.clearSelection();
    syncFiltersToUrl(newFilters, radiusKm);
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
      
      // Only update if coordinates actually changed - prevents infinite loops
      if (!areCoordinatesEqual(locationResult, userLocation)) {
        setUserLocation(locationResult);
        setFilters(prev => {
          // Double-check: don't update if already equal
          if (areCoordinatesEqual(locationResult, prev.coordinates)) {
            return prev;
          }
          const next = { ...prev, coordinates: locationResult };
          syncFiltersToUrl(next, radiusKm);
          return next;
        });
      }
    } else {
      warn('Geolocation failed, using default location (Rome)');
    }
  };

  // Handle radius change
  const handleRadiusChange = (newRadius: number) => {
    info('Radius changed', { oldRadius: radiusKm, newRadius });
    setRadiusKm(newRadius);
    
    // Update URL parameter
    if (filters.coordinates) {
      syncFiltersToUrl(filters, newRadius);
    }
  };

  // Use coordinates for map center if available
  const mapCenter = filters.coordinates || userLocation;

  return {
    // State
    filters,
    userLocation,
    mapCenter,
    radiusKm, // NEW
    searchMode, // NEW
    
    // Data
    spaces: flattenedSpaces,
    isLoading: spacesQuery.isLoading,
    isFetchingNextPage: spacesQuery.isFetchingNextPage,
    hasNextPage: Boolean(spacesQuery.hasNextPage),
    fetchNextPage: spacesQuery.fetchNextPage,
    error: spacesQuery.error,
    
    // Actions
    handleFiltersChange,
    handleRadiusChange, // NEW
    setSearchMode, // NEW
    getUserLocation,
    
    // Map interaction
    ...mapInteraction
  };
};
