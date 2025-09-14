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
  instantBook: false
};

export const usePublicSpacesLogic = () => {
  const { initialCity, initialCoordinates, updateLocationParam } = useLocationParams();
  const [filters, setFilters] = useState<SpaceFilters>(DEFAULT_FILTERS);
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  
  const { handleAsyncError } = useErrorHandler('PublicSpaces');
  const { warn, info } = useLogger({ context: 'usePublicSpacesLogic' });
  const { geocodeAddress } = useMapboxGeocoding();
  
  const mapInteraction = useMapCardInteraction();

  // Set initial city and coordinates from URL params
  useEffect(() => {
    if (initialCity && !filters.location) {
      setFilters(prev => ({ 
        ...prev, 
        location: initialCity,
        coordinates: initialCoordinates
      }));
    }
  }, [initialCity, initialCoordinates, filters.location]);

  // Initialize default location (Rome) - geolocation moved to user action
  useEffect(() => {
    if (!userLocation) {
      setUserLocation({ lat: 41.9028, lng: 12.4964 });
    }
  }, []);

  // Debounced geocoding for city search
  useEffect(() => {
    if (!filters.location || filters.location.trim().length < 3) {
      return;
    }

    const timer = setTimeout(async () => {
      info('Starting geocoding for city', { city: filters.location });
      
      try {
        const results = await geocodeAddress(filters.location);
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
  }, [filters.location, geocodeAddress, updateLocationParam, info, warn]);

  // Spaces data fetching with React Query
  const spacesQuery = useQuery({
    queryKey: ['public-spaces', filters],
    queryFn: async () => {
      info('Fetching public spaces with filters', { filters });
      
      // Use secure function that doesn't expose host_id
      const { data: spaces, error: spacesError } = await supabase.rpc('get_public_spaces');
      
      if (spacesError) {
        info('Failed to fetch spaces', { error: spacesError });
        throw spacesError;
      }

      let filteredSpaces = spaces || [];

      // Apply filters to the fetched data (client-side filtering)
      if (filters.category) {
        filteredSpaces = filteredSpaces.filter(space => space.category === filters.category);
      }
      if (filters.workEnvironment) {
        filteredSpaces = filteredSpaces.filter(space => 
          space.work_environment === filters.workEnvironment
        );
      }
      if (filters.priceRange[1] < 200) {
        filteredSpaces = filteredSpaces.filter(space => 
          space.price_per_day <= filters.priceRange[1]
        );
      }
      if (filters.priceRange[0] > 0) {
        filteredSpaces = filteredSpaces.filter(space => 
          space.price_per_day >= filters.priceRange[0]
        );
      }
      if (filters.capacity[1] < 20) {
        filteredSpaces = filteredSpaces.filter(space => 
          space.max_capacity <= filters.capacity[1]
        );
      }
      if (filters.capacity[0] > 1) {
        filteredSpaces = filteredSpaces.filter(space => 
          space.max_capacity >= filters.capacity[0]
        );
      }
      if (filters.location) {
        // Flexible city search: search in the address field for city names
        const searchTerm = filters.location.trim().toLowerCase();
        filteredSpaces = filteredSpaces.filter(space => 
          space.address?.toLowerCase().includes(searchTerm)
        );
      }
      
      info(`Successfully fetched and filtered ${filteredSpaces.length} spaces`);
      return filteredSpaces;
    },
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