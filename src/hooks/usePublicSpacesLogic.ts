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
 * Batch check availability for multiple spaces using RPC
 */
const checkSpacesAvailabilityBatch = async (
  spaceIds: string[],
  date: Date,
  startTime: string,
  endTime: string
): Promise<Record<string, { isAvailable: boolean; availableSpots: number; maxCapacity: number }>> => {
  try {
    const dateStr = date.toISOString().split('T')[0] || '';
    
    const { data, error } = await supabase.rpc('get_spaces_availability_batch', {
      space_ids: spaceIds,
      check_date: dateStr,
      check_start_time: startTime,
      check_end_time: endTime
    });

    if (error) {
      console.error('Error in batch availability check:', error);
      return {};
    }

    // Convert array result to object map
    const availabilityMap: Record<string, { isAvailable: boolean; availableSpots: number; maxCapacity: number }> = {};
    
    data?.forEach((item: any) => {
      availabilityMap[item.space_id] = {
        isAvailable: item.available_capacity > 0,
        availableSpots: item.available_capacity,
        maxCapacity: item.max_capacity
      };
    });

    return availabilityMap;
  } catch (error) {
    console.error('Error in checkSpacesAvailabilityBatch:', error);
    return {};
  }
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
        .select(`
          id, title, description, category, photos,
          price_per_day, price_per_hour, address, city_name, country_code,
          latitude, longitude, max_capacity, workspace_features, amenities,
          work_environment, seating_type, ideal_guest, confirmation_type,
          published, created_at, availability, host_first_name, host_last_name,
          host_profile_photo, host_bio, host_networking_enabled
        `);
      
      if (spacesError) {
        info('Failed to fetch spaces', { error: spacesError });
        throw spacesError;
      }

      const spaces = Array.isArray(spacesData) ? spacesData as any[] : [];
      let filteredSpaces = spaces || [];

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
        // Flexible city search: search in the address field for city names
        const searchTerm = filters.location.trim().toLowerCase();
        filteredSpaces = filteredSpaces.filter((space: any) => 
          space && space.address?.toLowerCase().includes(searchTerm)
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