import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { SpaceCard } from '@/components/spaces/SpaceCard';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search as SearchIcon, MapPin, List, Map as MapIcon } from 'lucide-react';
import { Space } from '@/types/space';
import { Skeleton } from '@/components/ui/skeleton';
import { LazySpaceMap } from '@/components/spaces/LazySpaceMap';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AnimatePresence, motion } from 'framer-motion';

const Search = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');

  // Initialize query from URL
  useEffect(() => {
    const queryParam = searchParams.get('q');
    const cityParam = searchParams.get('city');

    if (queryParam) {
      setSearchQuery(queryParam);
    } else if (cityParam) {
      setSearchQuery(cityParam);
    }
  }, [searchParams]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setSearchParams({ q: searchQuery.trim() });
    } else {
      setSearchParams({});
    }
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setSearchParams({});
  };

  // Fetch spaces logic
  const { data: spaces = [], isLoading, error } = useQuery({
    queryKey: ['search-spaces', searchQuery],
    queryFn: async () => {
      let query = supabase
        .from('spaces')
        .select('*');

      // Filter only published spaces
      query = query.eq('published', true);

      if (searchQuery) {
        // Sanitize query to avoid PostgREST syntax errors with commas
        const sanitizedQuery = searchQuery.replace(/,/g, ' ').trim();

        if (sanitizedQuery) {
          query = query.or(`name.ilike.%${sanitizedQuery}%, city.ilike.%${sanitizedQuery}%, address.ilike.%${sanitizedQuery}%`);
        }
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching spaces:', error);
        throw error;
      }

      // Map space data to Space type
      return (data || []).map((space: any) => ({
        id: space.id,
        title: space.name,
        description: space.description || "",
        photos: space.photos || space.images || [],
        address: space.address,
        latitude: space.latitude || 0,
        longitude: space.longitude || 0,
        price_per_day: space.price_per_day,
        price_per_hour: space.price_per_hour,
        max_capacity: space.max_capacity,
        category: space.category,
        workspace_features: space.features || space.workspace_features || [],
        amenities: space.amenities || [],
        work_environment: space.work_environment,
        // Default/Fallback values for required fields
        capacity: space.max_capacity,
        host_id: space.host_id,
        created_at: space.created_at,
        updated_at: space.updated_at,
        published: space.published,
        availability: space.availability,
        confirmation_type: space.confirmation_type || 'instant',
        city: space.city || "",
        cached_avg_rating: space.cached_avg_rating || 0,
        num_reviews: space.cached_review_count || 0,
        pending_approval: space.pending_approval,
        is_suspended: space.is_suspended,
        suspended_by: space.suspended_by,
        suspended_at: space.suspended_at,
        suspension_reason: space.suspension_reason,
        deleted_at: space.deleted_at
      } as Space));
    }
  });

  return (
    <div className="container mx-auto px-4 py-8 min-h-screen">
      <div className="mb-8 text-center md:text-left">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
          Cerca il tuo spazio ideale
        </h1>
        <p className="text-gray-600 text-lg">
          Trova uffici, coworking e sale riunioni in tutta Italia
        </p>
      </div>

      {/* Search Bar & View Toggle */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 mb-8 sticky top-20 z-40 space-y-4">
        <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <Input
              placeholder="Cerca per città, nome o zona..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-12 text-lg"
            />
          </div>
          <div className="flex gap-2">
            <Button type="submit" className="h-12 px-8 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-lg">
              Cerca
            </Button>
            {searchQuery && (
              <Button type="button" variant="outline" onClick={handleClearSearch} className="h-12">
                Reset
              </Button>
            )}
          </div>
        </form>

        <div className="flex justify-end">
           <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'list' | 'map')}>
            <TabsList>
              <TabsTrigger value="list" className="flex gap-2">
                <List className="h-4 w-4" />
                Elenco
              </TabsTrigger>
              <TabsTrigger value="map" className="flex gap-2">
                <MapIcon className="h-4 w-4" />
                Mappa
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Results */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="space-y-4">
              <Skeleton className="h-48 w-full rounded-xl" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="text-center py-12">
          <div className="text-red-500 mb-2">Si è verificato un errore durante la ricerca.</div>
          <Button onClick={() => window.location.reload()} variant="outline">Riprova</Button>
        </div>
      ) : spaces.length > 0 ? (
        <>
          <p className="text-gray-600 mb-6 font-medium">
            Trovati {spaces.length} spazi {searchQuery && `per "${searchQuery}"`}
          </p>

          <AnimatePresence mode="wait">
            {viewMode === 'list' ? (
              <motion.div
                key="list"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.2 }}
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
              >
                {spaces.map((space) => (
                  <SpaceCard
                    key={space.id}
                    space={space}
                    onClick={() => navigate(`/space/${space.id}`)}
                  />
                ))}
              </motion.div>
            ) : (
              <motion.div
                key="map"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="h-[600px] w-full rounded-xl overflow-hidden border border-gray-200 shadow-sm"
              >
                <LazySpaceMap
                  spaces={spaces}
                  userLocation={null} // TODO: Get user location
                  onSpaceClick={(id: string) => navigate(`/space/${id}`)}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </>
      ) : (
        /* Empty State */
        <div className="text-center py-24 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <MapPin className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            Nessuno spazio trovato
          </h3>
          <p className="text-gray-500 max-w-md mx-auto mb-8">
            Non abbiamo trovato spazi che corrispondono alla tua ricerca.
            Prova a cercare un'altra città o rimuovi i filtri.
          </p>
          <Button onClick={handleClearSearch} variant="outline">
            Mostra tutti gli spazi
          </Button>
        </div>
      )}
    </div>
  );
};

export default Search;
