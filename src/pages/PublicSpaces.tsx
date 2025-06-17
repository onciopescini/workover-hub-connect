import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { SpaceFilters } from '@/components/spaces/SpaceFilters';
import { SpaceMap } from '@/components/spaces/SpaceMap';
import { SpaceCardsGrid } from '@/components/spaces/SpaceCardsGrid';
import { SplitScreenLayout } from '@/components/shared/SplitScreenLayout';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { useMapCardInteraction } from '@/hooks/useMapCardInteraction';
import { useLocationParams } from '@/hooks/useLocationParams';

const PublicSpaces = () => {
  const navigate = useNavigate();
  const { authState } = useAuth();
  const { initialCity, initialCoordinates } = useLocationParams();
  const [filters, setFilters] = useState({
    category: '',
    priceRange: [0, 200],
    amenities: [] as string[],
    workEnvironment: '',
    location: '',
    coordinates: null as { lat: number; lng: number } | null
  });
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  
  const {
    selectedId,
    highlightedId,
    handleCardClick,
    handleMarkerClick,
    clearSelection
  } = useMapCardInteraction();

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

  // Get user location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          console.log('Geolocation error:', error);
          // Default to Rome if geolocation fails
          setUserLocation({ lat: 41.9028, lng: 12.4964 });
        }
      );
    } else {
      // Default to Rome if geolocation not supported
      setUserLocation({ lat: 41.9028, lng: 12.4964 });
    }
  }, []);

  const { data: spaces, isLoading, error } = useQuery({
    queryKey: ['public-spaces', filters],
    queryFn: async () => {
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
      if (filters.location) {
        query = query.ilike('city', `%${filters.location}%`);
      }

      const { data, error } = await query.order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching spaces:', error);
        throw error;
      }
      
      return data || [];
    },
  });

  const handleFiltersChange = (newFilters: typeof filters) => {
    setFilters(newFilters);
    clearSelection();
  };

  const handleSpaceClick = (spaceId: string) => {
    handleCardClick(spaceId);
    // Navigate to the correct route based on authentication status
    if (authState.isAuthenticated && authState.profile?.onboarding_completed) {
      navigate(`/app/spaces/${spaceId}`);
    } else {
      navigate(`/spaces/${spaceId}`);
    }
  };

  const handleMapSpaceClick = (spaceId: string) => {
    handleMarkerClick(spaceId);
  };

  // Use coordinates for map center if available
  const mapCenter = filters.coordinates || userLocation;

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Errore nel caricamento</h2>
          <p className="text-gray-600">Si è verificato un errore durante il caricamento degli spazi.</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <SplitScreenLayout
      filters={
        <div>
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Trova il tuo spazio di lavoro ideale
            </h1>
            <p className="text-gray-600">
              Scopri spazi di coworking, uffici privati e sale riunioni nella tua città
            </p>
          </div>
          <SpaceFilters filters={filters} onFiltersChange={handleFiltersChange} />
          {spaces && (
            <div className="mt-4">
              <p className="text-sm text-gray-600">
                {spaces.length} spazi trovati
              </p>
            </div>
          )}
        </div>
      }
      map={
        <SpaceMap 
          spaces={spaces || []} 
          userLocation={mapCenter}
          onSpaceClick={handleMapSpaceClick}
          highlightedSpaceId={highlightedId}
        />
      }
      cards={
        <SpaceCardsGrid 
          spaces={spaces || []} 
          onSpaceClick={handleSpaceClick}
          highlightedId={highlightedId}
        />
      }
    />
  );
};

export default PublicSpaces;
