
import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { SpaceCard } from '@/components/spaces/SpaceCard';
import { SpaceFilters } from '@/components/spaces/SpaceFilters';
import { SpaceMap } from '@/components/spaces/SpaceMap';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { Button } from '@/components/ui/button';
import { Map, Grid } from 'lucide-react';
import { MarketplaceLayout } from '@/components/layout/MarketplaceLayout';
import { PublicLayout } from '@/components/layout/PublicLayout';
import { useAuth } from '@/contexts/AuthContext';

const PublicSpaces = () => {
  const { authState } = useAuth();
  const [filters, setFilters] = useState({
    city: '',
    category: '',
    maxPrice: '',
    workEnvironment: '',
    tags: [] as string[]
  });
  const [showMap, setShowMap] = useState(false);

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

      if (filters.city) {
        query = query.ilike('address', `%${filters.city}%`);
      }
      if (filters.category) {
        query = query.eq('category', filters.category);
      }
      if (filters.workEnvironment) {
        query = query.eq('work_environment', filters.workEnvironment);
      }
      if (filters.maxPrice) {
        query = query.lte('price_per_day', parseFloat(filters.maxPrice));
      }

      const { data, error } = await query.order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching spaces:', error);
        throw error;
      }
      
      return data || [];
    },
  });

  const handleFilterChange = (newFilters: typeof filters) => {
    setFilters(newFilters);
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

  const content = (
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
            <SpaceFilters onFilterChange={handleFilterChange} />
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
              <SpaceMap spaces={spaces || []} />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {spaces?.map((space) => (
                  <SpaceCard key={space.id} space={space} />
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

  // Use MarketplaceLayout for authenticated users, PublicLayout for guests
  if (authState.isAuthenticated) {
    return <MarketplaceLayout>{content}</MarketplaceLayout>;
  }

  return <PublicLayout>{content}</PublicLayout>;
};

export default PublicSpaces;
