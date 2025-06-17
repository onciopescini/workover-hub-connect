
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search as SearchIcon, Filter } from 'lucide-react';

const Search = () => {
  const [searchQuery, setSearchQuery] = useState('');

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
          <div className="flex gap-4">
            <Input
              placeholder="Cerca spazi, eventi o persone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1"
            />
            <Button>
              <SearchIcon className="h-4 w-4 mr-2" />
              Cerca
            </Button>
            <Button variant="outline">
              <Filter className="h-4 w-4 mr-2" />
              Filtri
            </Button>
          </div>
          
          <div className="text-center py-12 text-gray-500">
            <SearchIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>Inserisci una parola chiave per iniziare la ricerca</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Search;
