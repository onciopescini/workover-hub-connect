
import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Search, 
  Filter, 
  MapPin, 
  Briefcase, 
  Star,
  Clock,
  Users,
  Bookmark,
  X,
  SlidersHorizontal
} from 'lucide-react';

interface NetworkingSearchProps {
  onSearch: (query: string, filters: SearchFilters) => void;
  savedSearches: string[];
}

interface SearchFilters {
  location: string;
  profession: string;
  industry: string;
  experience: string;
  rating: number;
  availability: string;
  connectionType: string;
}

export const NetworkingSearch: React.FC<NetworkingSearchProps> = ({
  onSearch,
  savedSearches
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<SearchFilters>({
    location: '',
    profession: '',
    industry: '',
    experience: '',
    rating: 0,
    availability: '',
    connectionType: ''
  });

  const industries = [
    'Tecnologia', 'Marketing', 'Design', 'Finanza', 'Consulenza',
    'E-commerce', 'Startup', 'Media', 'Immobiliare', 'Salute'
  ];

  const professions = [
    'Sviluppatore', 'Designer', 'Project Manager', 'Marketing Manager',
    'CEO', 'CTO', 'Sales Manager', 'Consulente', 'Architetto', 'Analista'
  ];

  const experienceLevels = ['Junior', 'Mid-level', 'Senior', 'Executive'];
  const availabilityOptions = ['Disponibile ora', 'Questa settimana', 'Questo mese'];
  const connectionTypes = ['Nuove connessioni', 'Connessioni comuni', 'Ex colleghi'];

  const handleSearch = () => {
    onSearch(searchQuery, filters);
  };

  const clearFilters = () => {
    setFilters({
      location: '',
      profession: '',
      industry: '',
      experience: '',
      rating: 0,
      availability: '',
      connectionType: ''
    });
  };

  const getActiveFiltersCount = () => {
    return Object.values(filters).filter(value => value && value !== 0).length;
  };

  return (
    <div className="space-y-4">
      {/* Main search bar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Cerca professionisti per nome, azienda o competenze..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2"
            >
              <SlidersHorizontal className="w-4 h-4" />
              Filtri
              {getActiveFiltersCount() > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {getActiveFiltersCount()}
                </Badge>
              )}
            </Button>
            <Button onClick={handleSearch} className="bg-indigo-600 hover:bg-indigo-700">
              <Search className="w-4 h-4 mr-2" />
              Cerca
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Quick filters */}
      <div className="flex gap-2 flex-wrap">
        <Button variant="outline" size="sm" onClick={() => setFilters({...filters, availability: 'Disponibile ora'})}>
          <Clock className="w-3 h-3 mr-1" />
          Disponibili ora
        </Button>
        <Button variant="outline" size="sm" onClick={() => setFilters({...filters, rating: 4.5})}>
          <Star className="w-3 h-3 mr-1" />
          Top rated
        </Button>
        <Button variant="outline" size="sm" onClick={() => setFilters({...filters, connectionType: 'Connessioni comuni'})}>
          <Users className="w-3 h-3 mr-1" />
          Connessioni comuni
        </Button>
        <Button variant="outline" size="sm" onClick={() => setFilters({...filters, location: 'Milano'})}>
          <MapPin className="w-3 h-3 mr-1" />
          Milano
        </Button>
      </div>

      {/* Active filters */}
      {getActiveFiltersCount() > 0 && (
        <div className="flex gap-2 flex-wrap items-center">
          <span className="text-sm font-medium text-gray-700">Filtri attivi:</span>
          {Object.entries(filters).map(([key, value]) => 
            value && value !== 0 ? (
              <Badge key={key} variant="secondary" className="flex items-center gap-1">
                {key === 'rating' ? `${value}+ stelle` : value}
                <X 
                  className="w-3 h-3 cursor-pointer" 
                  onClick={() => setFilters({...filters, [key]: key === 'rating' ? 0 : ''})}
                />
              </Badge>
            ) : null
          )}
          <Button variant="ghost" size="sm" onClick={clearFilters} className="text-gray-500">
            Cancella tutti
          </Button>
        </div>
      )}

      {/* Advanced filters panel */}
      {showFilters && (
        <Card>
          <CardContent className="p-6">
            <Tabs defaultValue="location" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="location">Posizione</TabsTrigger>
                <TabsTrigger value="professional">Professionale</TabsTrigger>
                <TabsTrigger value="quality">Qualità</TabsTrigger>
                <TabsTrigger value="availability">Disponibilità</TabsTrigger>
              </TabsList>
              
              <TabsContent value="location" className="space-y-4 mt-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">
                    Città o area
                  </label>
                  <Input
                    placeholder="es. Milano, Roma, Torino..."
                    value={filters.location}
                    onChange={(e) => setFilters({...filters, location: e.target.value})}
                  />
                </div>
              </TabsContent>

              <TabsContent value="professional" className="space-y-4 mt-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">
                    Settore
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {industries.map(industry => (
                      <Button
                        key={industry}
                        variant={filters.industry === industry ? "default" : "outline"}
                        size="sm"
                        onClick={() => setFilters({...filters, industry: filters.industry === industry ? '' : industry})}
                        className="justify-start"
                      >
                        {industry}
                      </Button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">
                    Ruolo
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {professions.map(profession => (
                      <Button
                        key={profession}
                        variant={filters.profession === profession ? "default" : "outline"}
                        size="sm"
                        onClick={() => setFilters({...filters, profession: filters.profession === profession ? '' : profession})}
                        className="justify-start"
                      >
                        {profession}
                      </Button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">
                    Livello di esperienza
                  </label>
                  <div className="flex gap-2">
                    {experienceLevels.map(level => (
                      <Button
                        key={level}
                        variant={filters.experience === level ? "default" : "outline"}
                        size="sm"
                        onClick={() => setFilters({...filters, experience: filters.experience === level ? '' : level})}
                      >
                        {level}
                      </Button>
                    ))}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="quality" className="space-y-4 mt-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">
                    Rating minimo
                  </label>
                  <div className="flex gap-2">
                    {[3, 3.5, 4, 4.5, 5].map(rating => (
                      <Button
                        key={rating}
                        variant={filters.rating === rating ? "default" : "outline"}
                        size="sm"
                        onClick={() => setFilters({...filters, rating: filters.rating === rating ? 0 : rating})}
                      >
                        {rating}+ ⭐
                      </Button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">
                    Tipo di connessione
                  </label>
                  <div className="space-y-2">
                    {connectionTypes.map(type => (
                      <Button
                        key={type}
                        variant={filters.connectionType === type ? "default" : "outline"}
                        size="sm"
                        onClick={() => setFilters({...filters, connectionType: filters.connectionType === type ? '' : type})}
                        className="w-full justify-start"
                      >
                        {type}
                      </Button>
                    ))}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="availability" className="space-y-4 mt-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">
                    Disponibilità
                  </label>
                  <div className="space-y-2">
                    {availabilityOptions.map(option => (
                      <Button
                        key={option}
                        variant={filters.availability === option ? "default" : "outline"}
                        size="sm"
                        onClick={() => setFilters({...filters, availability: filters.availability === option ? '' : option})}
                        className="w-full justify-start"
                      >
                        {option}
                      </Button>
                    ))}
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}

      {/* Saved searches */}
      {savedSearches.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Bookmark className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">Ricerche salvate</span>
            </div>
            <div className="flex gap-2 flex-wrap">
              {savedSearches.map((search, index) => (
                <Button key={index} variant="outline" size="sm" className="text-xs">
                  {search}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
