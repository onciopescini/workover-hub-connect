
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  MapPin, 
  Filter, 
  X, 
  Star, 
  Users, 
  Euro, 
  Calendar,
  Search,
  Bookmark,
  RotateCcw
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { SpaceFilters, FilterChangeHandler, FormFieldValue } from '@/types/space-filters';

interface AdvancedSpaceFiltersProps {
  filters: SpaceFilters;
  onFiltersChange: FilterChangeHandler;
  totalResults?: number;
}

export const AdvancedSpaceFilters: React.FC<AdvancedSpaceFiltersProps> = ({
  filters,
  onFiltersChange,
  totalResults = 0
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [savedSearches, setSavedSearches] = useState<string[]>([]);

  const categories = [
    { value: '', label: 'Tutti' },
    { value: 'home', label: 'Casa' },
    { value: 'professional', label: 'Professionale' },
    { value: 'outdoor', label: 'Outdoor' }
  ];

  const workEnvironments = [
    { value: '', label: 'Tutti' },
    { value: 'silent', label: 'Silenzioso' },
    { value: 'controlled', label: 'Controllato' },
    { value: 'dynamic', label: 'Dinamico' }
  ];

  const amenitiesList = [
    'High-speed WiFi',
    'Coffee & Tea',
    'Parking',
    'Kitchen',
    'Air conditioning',
    'Printer',
    'Whiteboard',
    'Projector',
    'Meeting Room',
    'Phone Booth'
  ];

  const quickFilters = [
    { label: 'Vicino a me', action: () => getLocationAndFilter() },
    { label: 'Disponibile ora', action: () => filterAvailableNow() },
    { label: 'Top rated', action: () => updateFilter('rating', 4.5) },
    { label: 'Superhost', action: () => updateFilter('superhost', true) },
    { label: 'Prenotazione istantanea', action: () => updateFilter('instantBook', true) }
  ];

  const updateFilter = (key: keyof SpaceFilters, value: FormFieldValue) => {
    onFiltersChange({
      ...filters,
      [key]: value
    });
  };

  const handleLocationChange = (value: string) => {
    updateFilter('location', value);
  };

  const handleAmenityToggle = (amenity: string) => {
    const newAmenities = filters.amenities.includes(amenity)
      ? filters.amenities.filter(a => a !== amenity)
      : [...filters.amenities, amenity];
    
    updateFilter('amenities', newAmenities);
  };

  const clearAllFilters = () => {
    onFiltersChange({
      category: '',
      priceRange: [0, 200],
      amenities: [],
      workEnvironment: '',
      location: '',
      coordinates: null,
      capacity: [1, 20],
      rating: 0,
      verified: false,
      superhost: false,
      instantBook: false
    });
  };

  const getActiveFiltersCount = () => {
    let count = 0;
    if (filters.category) count++;
    if (filters.priceRange[1] < 200) count++;
    if (filters.amenities.length > 0) count++;
    if (filters.workEnvironment) count++;
    if (filters.rating > 0) count++;
    if (filters.verified) count++;
    if (filters.superhost) count++;
    if (filters.instantBook) count++;
    return count;
  };

  const getLocationAndFilter = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((position) => {
        updateFilter('coordinates', {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });
      }, (error) => {
        console.warn('Geolocation error:', error);
      }, {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 600000
      });
    }
  };

  const filterAvailableNow = () => {
    // Implementare logica per filtrare spazi disponibili ora
    // Filter available now - using proper state management
  };

  const saveCurrentSearch = () => {
    const searchName = `Ricerca ${savedSearches.length + 1}`;
    setSavedSearches([...savedSearches, searchName]);
  };

  return (
    <div className="space-y-4">
      {/* Header con risultati e azioni rapide */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-semibold">
            {totalResults} spazi trovati
          </h2>
          {getActiveFiltersCount() > 0 && (
            <Badge variant="secondary" className="flex items-center gap-1">
              <Filter className="w-3 h-3" />
              {getActiveFiltersCount()} filtri attivi
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-2"
          >
            <Filter className="w-4 h-4" />
            {isExpanded ? 'Nascondi filtri' : 'Mostra filtri'}
          </Button>
          {getActiveFiltersCount() > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAllFilters}
              className="flex items-center gap-2 text-gray-600"
            >
              <RotateCcw className="w-4 h-4" />
              Reset
            </Button>
          )}
        </div>
      </div>

      {/* Quick Filters */}
      <div className="flex flex-wrap gap-2">
        {quickFilters.map((filter, index) => (
          <Button
            key={index}
            variant="outline"
            size="sm"
            onClick={filter.action}
            className="text-sm"
          >
            {filter.label}
          </Button>
        ))}
      </div>

      {/* Filtri attivi */}
      {getActiveFiltersCount() > 0 && (
        <div className="flex flex-wrap gap-2">
          {filters.category && (
            <Badge variant="secondary" className="flex items-center gap-1">
              {categories.find(c => c.value === filters.category)?.label}
              <X 
                className="w-3 h-3 cursor-pointer" 
                onClick={() => updateFilter('category', '')}
              />
            </Badge>
          )}
          {filters.workEnvironment && (
            <Badge variant="secondary" className="flex items-center gap-1">
              {workEnvironments.find(w => w.value === filters.workEnvironment)?.label}
              <X 
                className="w-3 h-3 cursor-pointer" 
                onClick={() => updateFilter('workEnvironment', '')}
              />
            </Badge>
          )}
          {filters.superhost && (
            <Badge variant="secondary" className="flex items-center gap-1">
              Superhost
              <X 
                className="w-3 h-3 cursor-pointer" 
                onClick={() => updateFilter('superhost', false)}
              />
            </Badge>
          )}
          {filters.amenities.map(amenity => (
            <Badge key={amenity} variant="secondary" className="flex items-center gap-1">
              {amenity}
              <X 
                className="w-3 h-3 cursor-pointer" 
                onClick={() => handleAmenityToggle(amenity)}
              />
            </Badge>
          ))}
        </div>
      )}

      {/* Panel filtri espanso */}
      {isExpanded && (
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Filtri avanzati</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={saveCurrentSearch}
                className="flex items-center gap-2"
              >
                <Bookmark className="w-4 h-4" />
                Salva ricerca
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* City Search */}
            <div>
              <h4 className="font-medium mb-3 flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                Città
              </h4>
              <Input
                type="text"
                placeholder="Cerca per città (es. Milano, Roma...)..."
                value={filters.location || ''}
                onChange={(e) => handleLocationChange(e.target.value)}
                className="w-full"
              />
            </div>

            {/* Categoria */}
            <div>
              <h4 className="font-medium mb-3">Categoria spazio</h4>
              <div className="grid grid-cols-2 gap-2">
                {categories.map(category => (
                  <Button
                    key={category.value}
                    variant={filters.category === category.value ? "default" : "outline"}
                    size="sm"
                    onClick={() => updateFilter('category', category.value)}
                    className="justify-start"
                  >
                    {category.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Ambiente di lavoro */}
            <div>
              <h4 className="font-medium mb-3">Ambiente di lavoro</h4>
              <div className="grid grid-cols-2 gap-2">
                {workEnvironments.map(env => (
                  <Button
                    key={env.value}
                    variant={filters.workEnvironment === env.value ? "default" : "outline"}
                    size="sm"
                    onClick={() => updateFilter('workEnvironment', env.value)}
                    className="justify-start"
                  >
                    {env.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Range prezzo */}
            <div>
              <h4 className="font-medium mb-3 flex items-center gap-2">
                <Euro className="w-4 h-4" />
                Prezzo per giorno: €{filters.priceRange[0]} - €{filters.priceRange[1]}
              </h4>
              <Slider
                value={filters.priceRange}
                onValueChange={(value) => updateFilter('priceRange', value as [number, number])}
                max={200}
                min={0}
                step={5}
                className="w-full"
              />
            </div>

            {/* Capacità */}
            <div>
              <h4 className="font-medium mb-3 flex items-center gap-2">
                <Users className="w-4 h-4" />
                Capacità: {filters.capacity[0]} - {filters.capacity[1]} persone
              </h4>
              <Slider
                value={filters.capacity}
                onValueChange={(value) => updateFilter('capacity', value as [number, number])}
                max={20}
                min={1}
                step={1}
                className="w-full"
              />
            </div>

            {/* Rating minimo */}
            <div>
              <h4 className="font-medium mb-3 flex items-center gap-2">
                <Star className="w-4 h-4" />
                Rating minimo: {filters.rating > 0 ? `${filters.rating}★` : 'Qualsiasi'}
              </h4>
              <Slider
                value={[filters.rating]}
                onValueChange={(value) => updateFilter('rating', value[0] || 0)}
                max={5}
                min={0}
                step={0.5}
                className="w-full"
              />
            </div>

            {/* Opzioni speciali */}
            <div>
              <h4 className="font-medium mb-3">Opzioni speciali</h4>
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="verified"
                    checked={filters.verified}
                    onCheckedChange={(checked) => updateFilter('verified', checked)}
                  />
                  <label htmlFor="verified" className="text-sm">
                    Solo spazi verificati
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="superhost"
                    checked={filters.superhost}
                    onCheckedChange={(checked) => updateFilter('superhost', checked)}
                  />
                  <label htmlFor="superhost" className="text-sm">
                    Solo Superhost
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="instantBook"
                    checked={filters.instantBook}
                    onCheckedChange={(checked) => updateFilter('instantBook', checked)}
                  />
                  <label htmlFor="instantBook" className="text-sm">
                    Prenotazione istantanea
                  </label>
                </div>
              </div>
            </div>

            {/* Servizi */}
            <div>
              <h4 className="font-medium mb-3">Servizi disponibili</h4>
              <div className="grid grid-cols-2 gap-3">
                {amenitiesList.map(amenity => (
                  <div key={amenity} className="flex items-center space-x-2">
                    <Checkbox
                      id={amenity}
                      checked={filters.amenities.includes(amenity)}
                      onCheckedChange={() => handleAmenityToggle(amenity)}
                    />
                    <label htmlFor={amenity} className="text-sm">
                      {amenity}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Ricerche salvate */}
      {savedSearches.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Ricerche salvate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {savedSearches.map((search, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  className="text-xs"
                >
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
