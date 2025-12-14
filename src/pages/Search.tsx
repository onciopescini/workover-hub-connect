import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search as SearchIcon, Filter, MapPin } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { SpaceCard } from '@/components/spaces/SpaceCard';
import { Space } from '@/types/space';

const Search = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState('');
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Initialize query from URL params
  useEffect(() => {
    const queryParam = searchParams.get('q');
    if (queryParam) {
      setSearchQuery(queryParam);
      fetchSpaces(queryParam);
    } else {
      fetchSpaces(); // Load all/featured spaces initially
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
    const trimmedQuery = searchQuery.trim();
    if (trimmedQuery) {
      setSearchParams({ q: trimmedQuery });
    } else {
      setSearchParams({});
      fetchSpaces(); // Reset to all
    }
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setSearchParams({});
    fetchSpaces();
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Cerca su Workover
        </h1>
        <p className="text-gray-600">
          Trova spazi e professionisti
        </p>
      </div>

      <Card className="mb-8">
        <CardContent className="pt-6">
          <form onSubmit={handleSearch} className="flex gap-4">
            <div className="relative flex-1">
              <SearchIcon className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Cerca per nome o città..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button type="submit">
              Cerca
            </Button>
            <Button type="button" variant="outline" onClick={handleClearSearch}>
              <Filter className="h-4 w-4 mr-2" />
              Reset
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Results Grid */}
      <div className="space-y-6">
        {isLoading ? (
          <div className="text-center py-12 text-gray-500">
            <p>Caricamento risultati...</p>
          </div>
        ) : spaces.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {spaces.map((space) => (
              <SpaceCard key={space.id} space={space} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-gray-50 rounded-lg border border-dashed border-gray-300">
            <MapPin className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium text-gray-900">Nessuno spazio trovato</h3>
            <p className="text-gray-500 mt-1">
              Prova a cambiare i termini di ricerca o esplora le categorie.
            </p>
            <Button variant="link" onClick={handleClearSearch} className="mt-4">
              Mostra tutti gli spazi
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Search;
