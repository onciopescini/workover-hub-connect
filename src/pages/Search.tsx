import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { SpaceCard } from '@/components/spaces/SpaceCard';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search as SearchIcon, MapPin } from 'lucide-react';
import { Space } from '@/types/space';
import { Skeleton } from '@/components/ui/skeleton';

const Search = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [isLoading, setIsLoading] = useState(false);

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

  const fetchSpaces = async (query?: string) => {
    setIsLoading(true);
    try {
      let dbQuery = supabase
        .from('workspaces') // Query workspaces table directly
        .select('*')
        .eq('published', true);

      if (query) {
        dbQuery = dbQuery.or(`name.ilike.%${query}%,city.ilike.%${query}%`);
      } else {
        dbQuery = dbQuery.limit(12); // Initial load limit
      }

      const { data, error } = await dbQuery;

      if (error) throw error;

      // Transform workspace data to Space type if necessary
      const transformedSpaces: Space[] = (data || []).map((workspace: any) => ({
        ...workspace,
        title: workspace.name, // Map name to title
        features: workspace.features || [],
        amenities: workspace.amenities || [],
        photos: workspace.photos || []
      }));

      setSpaces(transformedSpaces);
    } catch (error) {
      console.error('Error fetching spaces:', error);
    } finally {
      setIsLoading(false);
    }
  };

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
    fetchSpaces();
  };

  // Fetch spaces logic
  const { data: spaces = [], isLoading, error } = useQuery({
    queryKey: ['search-spaces', searchQuery],
    queryFn: async () => {
      let query = supabase
        .from('workspaces' as any)
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

      // Map workspace data to Space type
      return (data || []).map((workspace: any) => ({
        id: workspace.id,
        title: workspace.name,
        description: workspace.description || "",
        photos: workspace.photos || workspace.images || [],
        address: workspace.address,
        latitude: workspace.latitude || 0,
        longitude: workspace.longitude || 0,
        price_per_day: workspace.price_per_day,
        price_per_hour: workspace.price_per_hour,
        max_capacity: workspace.max_capacity,
        category: workspace.category,
        workspace_features: workspace.features || workspace.workspace_features || [],
        amenities: workspace.amenities || [],
        work_environment: workspace.work_environment,
        // Default/Fallback values for required fields
        capacity: workspace.max_capacity,
        host_id: workspace.host_id,
        created_at: workspace.created_at,
        updated_at: workspace.updated_at,
        published: workspace.published,
        availability: workspace.availability,
        confirmation_type: workspace.confirmation_type || 'instant'
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

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 mb-8 sticky top-20 z-40">
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
      </div>

      {/* Results Grid */}
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {spaces.map((space) => (
              <SpaceCard
                key={space.id}
                space={space}
                onClick={() => navigate(`/space/${space.id}`)}
              />
            ))}
          </div>
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
