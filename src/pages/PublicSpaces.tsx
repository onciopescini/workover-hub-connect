
import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { SpaceCard } from '@/components/spaces/SpaceCard';
import { SpaceFilters } from '@/components/spaces/SpaceFilters';
import { SpaceMap } from '@/components/spaces/SpaceMap';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { Button } from '@/components/ui/button';
import { Map, Grid } from 'lucide-react';

const PublicSpaces = () => {
  const [filters, setFilters] = useState({
    category: '',
    priceRange: [0, 200],
    amenities: [] as string[],
    workEnvironment: ''
  });
  const [showMap, setShowMap] = useState(false);
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);

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
  };

  const handleSpaceClick = (spaceId: string) => {
    window.open(`/spaces/${spaceId}`, '_blank');
  };

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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Trova il tuo spazio di lavoro ideale
          </h1>
          <p className="text-gray-600">
            Scopri spazi di coworking, uffici privati e sale riunioni nella tua città
          </p>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          <div className="lg:w-1/4">
            <SpaceFilters filters={filters} onFiltersChange={handleFiltersChange} />
          </div>

          <div className="lg:w-3/4">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-2">
                <Button
                  variant={!showMap ? "default" : "outline"}
                  size="sm"
                  onClick={() => setShowMap(false)}
                  className="flex items-center gap-2"
                >
                  <Grid className="h-4 w-4" />
                  Griglia
                </Button>
                <Button
                  variant={showMap ? "default" : "outline"}
                  size="sm"
                  onClick={() => setShowMap(true)}
                  className="flex items-center gap-2"
                >
                  <Map className="h-4 w-4" />
                  Mappa
                </Button>
              </div>
              
              {spaces && (
                <p className="text-sm text-gray-600">
                  {spaces.length} spazi trovati
                </p>
              )}
            </div>

            {isLoading ? (
              <div className="flex justify-center items-center h-64">
                <LoadingSpinner />
              </div>
            ) : showMap ? (
              <div className="h-[600px]">
                <SpaceMap 
                  spaces={spaces || []} 
                  userLocation={userLocation}
                  onSpaceClick={handleSpaceClick}
                />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {spaces?.map((space) => (
                  <SpaceCard 
                    key={space.id} 
                    space={space} 
                    onClick={() => handleSpaceClick(space.id)}
                  />
                ))}
                {spaces?.length === 0 && (
                  <div className="col-span-full text-center py-12">
                    <p className="text-gray-500">Nessuno spazio trovato con i filtri selezionati.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PublicSpaces;
