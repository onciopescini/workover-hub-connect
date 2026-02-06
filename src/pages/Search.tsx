import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { SpaceCard } from '@/components/spaces/SpaceCard';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search as SearchIcon, MapPin, List, Map as MapIcon, Locate, SlidersHorizontal } from 'lucide-react';
import { Space } from '@/types/space';
import { mapSpaceRowToSpace } from '@/lib/space-mappers';
import { Skeleton } from '@/components/ui/skeleton';
import { LazySpaceMap } from '@/components/spaces/LazySpaceMap';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AnimatePresence, motion } from 'framer-motion';
import { useUserLocation } from '@/hooks/useUserLocation';
import { AmenityFilters } from '@/components/spaces/search/AmenityFilters';
import { queryKeys } from '@/lib/react-query-config';
import type { Database } from '@/integrations/supabase/types';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

const Search = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [isNearMeActive, setIsNearMeActive] = useState<boolean>(false);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  
  // Real geolocation hook
  const { userLocation, getUserLocation, isLoading: isGettingLocation } = useUserLocation();

  // Initialize query from URL
  useEffect(() => {
    const queryParam = searchParams.get('q');
    const cityParam = searchParams.get('city');
    const amenitiesParam = searchParams.get('amenities');

    if (queryParam) {
      setSearchQuery(queryParam);
    } else if (cityParam) {
      setSearchQuery(cityParam);
    }
    
    if (amenitiesParam) {
      setSelectedAmenities(amenitiesParam.split(','));
    }
  }, [searchParams]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (searchQuery.trim()) {
      params.set('q', searchQuery.trim());
    }
    if (selectedAmenities.length > 0) {
      params.set('amenities', selectedAmenities.join(','));
    }
    setSearchParams(params);
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setSelectedAmenities([]);
    setIsNearMeActive(false);
    setSearchParams(new URLSearchParams());
  };

  const handleNearMeSearch = async (): Promise<void> => {
    const location = await getUserLocation();
    if (location) {
      setIsNearMeActive(true);
    }
  };
  
  const handleAmenitiesChange = (amenities: string[]) => {
    setSelectedAmenities(amenities);
    // Update URL immediately for amenity changes
    const params = new URLSearchParams();
    if (searchQuery.trim()) {
      params.set('q', searchQuery.trim());
    }
    if (amenities.length > 0) {
      params.set('amenities', amenities.join(','));
    }
    setSearchParams(params);
  };

  // Fetch spaces logic with amenity filtering
  const { data: spaces = [], isLoading, error } = useQuery({
    queryKey: queryKeys.spaces.list({
      query: searchQuery,
      amenities: selectedAmenities,
      nearMe: isNearMeActive,
      lat: userLocation?.lat,
      lng: userLocation?.lng,
    }),
    queryFn: async () => {
      type NearbySpaceRpcRow = Database['public']['Functions']['get_nearby_spaces']['Returns'][number];

      if (isNearMeActive && userLocation) {
        const { data, error: rpcError } = await supabase.rpc('get_nearby_spaces', {
          lat: userLocation.lat,
          long: userLocation.lng,
          radius_meters: 20000,
          limit: 100,
          offset: 0,
        });

        if (rpcError) {
          throw rpcError;
        }

        const rpcSpaces: NearbySpaceRpcRow[] = data ?? [];

        const filteredRpcSpaces = selectedAmenities.length > 0
          ? rpcSpaces.filter((space) => {
              return selectedAmenities.every((amenity) => {
                if (amenity === 'Meeting room') {
                  return space.workspace_features.includes(amenity);
                }
                return space.amenities.includes(amenity);
              });
            })
          : rpcSpaces;

        return filteredRpcSpaces
          .map((space) => mapSpaceRowToSpace(space))
          .filter((space): space is Space => space !== null);
      }

      let query = supabase
        .from('spaces')
        .select(`
          id, host_id, title, description, address, city_name, latitude, longitude,
          price_per_hour, price_per_day, max_capacity, amenities, photos, category,
          published, cached_avg_rating, cached_review_count, workspace_features,
          seating_types, work_environment, confirmation_type
        `);

      // Filter only published spaces
      query = query.eq('published', true);

      if (searchQuery) {
        // Sanitize query to avoid PostgREST syntax errors with commas
        const sanitizedQuery = searchQuery.replace(/,/g, ' ').trim();

        if (sanitizedQuery) {
          query = query.or(`title.ilike.%${sanitizedQuery}%, city_name.ilike.%${sanitizedQuery}%, address.ilike.%${sanitizedQuery}%`);
        }
      }
      
      // Apply amenity filters using PostgreSQL array contains operator
      for (const amenity of selectedAmenities) {
        // Check both amenities and workspace_features columns
        if (amenity === 'Meeting room') {
          query = query.contains('workspace_features', [amenity]);
        } else {
          query = query.contains('amenities', [amenity]);
        }
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching spaces:', error);
        throw error;
      }

      // Map space data to Space type
      return (data || [])
        .map((space) => (space ? mapSpaceRowToSpace(space) : null))
        .filter((space): space is Space => space !== null);
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
            <Button type="submit" className="h-12 px-8 bg-primary hover:bg-primary/90 text-primary-foreground font-medium text-lg">
              Cerca
            </Button>
            <Button 
              type="button" 
              variant="outline" 
              onClick={handleNearMeSearch}
              disabled={isGettingLocation}
              className="h-12"
              title="Trova spazi vicino a me"
            >
              <Locate className={`h-4 w-4 mr-2 ${isGettingLocation ? 'animate-pulse' : ''}`} />
              {isGettingLocation ? 'Localizzazione...' : 'Vicino a me'}
            </Button>
            {(searchQuery || selectedAmenities.length > 0) && (
              <Button type="button" variant="outline" onClick={handleClearSearch} className="h-12">
                Reset
              </Button>
            )}
          </div>
        </form>

        {/* Amenity Filters Toggle */}
        <Collapsible open={isFiltersOpen} onOpenChange={setIsFiltersOpen}>
          <div className="flex items-center justify-between">
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-2">
                <SlidersHorizontal className="h-4 w-4" />
                Filtri
                {selectedAmenities.length > 0 && (
                  <span className="ml-1 bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-full">
                    {selectedAmenities.length}
                  </span>
                )}
              </Button>
            </CollapsibleTrigger>
            
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
          
          <CollapsibleContent className="pt-4">
            <AmenityFilters
              selectedAmenities={selectedAmenities}
              onAmenitiesChange={handleAmenitiesChange}
            />
          </CollapsibleContent>
        </Collapsible>
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
                className="h-[600px] w-full rounded-xl overflow-hidden border border-gray-200 shadow-sm relative"
              >
                <LazySpaceMap
                  spaces={spaces}
                  userLocation={userLocation}
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
