
import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search as SearchIcon, Filter } from 'lucide-react';

const Search = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState('');

  // Inizializza la query di ricerca dai parametri URL
  useEffect(() => {
    const queryParam = searchParams.get('q');
    if (queryParam) {
      setSearchQuery(queryParam);
    }
  }, [searchParams]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setSearchParams({ q: searchQuery.trim() });
    }
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setSearchParams({});
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Cerca su Workover
        </h1>
        <p className="text-gray-600">
          Trova spazi, eventi e professionisti
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <SearchIcon className="h-5 w-5" />
            Ricerca
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleSearch} className="flex gap-4">
            <Input
              placeholder="Cerca spazi, eventi o persone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1"
            />
            <Button type="submit">
              <SearchIcon className="h-4 w-4 mr-2" />
              Cerca
            </Button>
            <Button type="button" variant="outline" onClick={handleClearSearch}>
              <Filter className="h-4 w-4 mr-2" />
              Filtri
            </Button>
          </form>
          
          {searchQuery ? (
            <div className="text-center py-12">
              <p className="text-gray-500 mb-4">
                Risultati per: "<strong>{searchQuery}</strong>"
              </p>
              <p className="text-gray-400">
                Funzionalità di ricerca in sviluppo. Presto potrai cercare tra tutti i contenuti della piattaforma.
              </p>
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <SearchIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>Inserisci una parola chiave per iniziare la ricerca</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Search;
