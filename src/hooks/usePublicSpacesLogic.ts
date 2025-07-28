/**
 * Public Spaces Business Logic Hook
 * 
 * Extracted from PublicSpaces.tsx to separate concerns and improve maintainability.
 * Handles filters, location, and data fetching logic.
 */
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLocationParams } from '@/hooks/useLocationParams';
import { useMapCardInteraction } from '@/hooks/useMapCardInteraction';
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
  const { initialCity, initialCoordinates } = useLocationParams();
  const [filters, setFilters] = useState<SpaceFilters>(DEFAULT_FILTERS);
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  
  const { handleAsyncError } = useErrorHandler('PublicSpaces');
  const { warn, info } = useLogger({ context: 'usePublicSpacesLogic' });
  
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

  // Spaces data fetching with React Query
  const spacesQuery = useQuery({
    queryKey: ['public-spaces', filters],
    queryFn: async () => {
      info('Fetching public spaces with filters', { filters });
      
      let query = supabase
        .from('spaces')
        .select(`
          *,
          profiles!spaces_host_id_fkey (
            first_name,
            last_name,
            profile_photo_url
          )
        `)
        .eq('published', true);

      // Apply filters
      if (filters.category) {
        query = query.eq('category', filters.category as 'home' | 'outdoor' | 'professional');
      }
      if (filters.workEnvironment) {
        query = query.eq('work_environment', filters.workEnvironment as 'silent' | 'controlled' | 'dynamic');
      }
      if (filters.priceRange[1] < 200) {
        query = query.lte('price_per_day', filters.priceRange[1]);
      }
      if (filters.priceRange[0] > 0) {
        query = query.gte('price_per_day', filters.priceRange[0]);
      }
      if (filters.capacity[1] < 20) {
        query = query.lte('max_capacity', filters.capacity[1]);
      }
      if (filters.capacity[0] > 1) {
        query = query.gte('max_capacity', filters.capacity[0]);
      }
      if (filters.location) {
        query = query.ilike('address', `%${filters.location}%`);
      }

      const { data, error } = await query.order('created_at', { ascending: false });
      
      if (error) {
        throw error;
      }
      
      info(`Successfully fetched ${data?.length || 0} spaces`);
      return data || [];
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