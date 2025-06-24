
import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/OptimizedAuthContext';
import { supabase } from '@/integrations/supabase/client';
import { AdvancedSpaceFilters } from '@/components/spaces/AdvancedSpaceFilters';
import { SpaceMap } from '@/components/spaces/SpaceMap';
import { EnhancedSpaceCardsGrid } from '@/components/spaces/EnhancedSpaceCardsGrid';
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
    priceRange: [0, 200] as [number, number],
    amenities: [] as string[],
    workEnvironment: '',
    location: '',
    coordinates: null as { lat: number; lng: number } | null,
    capacity: [1, 20] as [number, number],
    rating: 0,
    verified: false,
    superhost: false,
    instantBook: false
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
      if (filters.capacity[1] < 20) {
        query = query.lte('max_capacity', filters.capacity[1]);
      }
      if (filters.capacity[0] > 1) {
        query = query.gte('max_capacity', filters.capacity[0]);
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
    navigate(`/spaces/${spaceId}`);
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

  return (
    <div className="min-h-screen bg-gray-50">
      <SplitScreenLayout
        filters={
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Trova il tuo spazio di lavoro ideale
              </h1>
              <p className="text-gray-600 mb-4">
                Scopri spazi di coworking, uffici privati e sale riunioni nella tua città
              </p>
              {spaces && (
                <div className="text-sm text-gray-500">
                  Aggiornato {new Date().toLocaleTimeString('it-IT')}
                </div>
              )}
            </div>
            <AdvancedSpaceFilters 
              filters={filters} 
              onFiltersChange={handleFiltersChange}
              totalResults={spaces?.length || 0}
            />
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
          <EnhancedSpaceCardsGrid 
            spaces={spaces || []} 
            onSpaceClick={handleSpaceClick}
            highlightedId={highlightedId}
            isLoading={isLoading}
          />
        }
      />
    </div>
  );
};

export default PublicSpaces;
