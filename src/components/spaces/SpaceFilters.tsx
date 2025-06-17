import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
} from '@/components/ui/dropdown-menu';
import { Slider } from '@/components/ui/slider';
import { Filter, X } from 'lucide-react';
import { CATEGORY_OPTIONS, AMENITIES_OPTIONS, WORK_ENVIRONMENT_OPTIONS } from '@/types/space';
import { GeographicSearch } from '@/components/shared/GeographicSearch';

interface SpaceFiltersProps {
  filters: {
    category: string;
    priceRange: number[];
    amenities: string[];
    workEnvironment: string;
    location?: string;
    coordinates?: { lat: number; lng: number };
  };
  onFiltersChange: (filters: any) => void;
}

export const SpaceFilters: React.FC<SpaceFiltersProps> = ({ filters, onFiltersChange }) => {
  const updateFilter = (key: string, value: any) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const handleLocationSelect = (location: string, coordinates?: { lat: number; lng: number }) => {
    onFiltersChange({ 
      ...filters, 
      location,
      coordinates
    });
  };

  const addAmenity = (amenity: string) => {
    if (!filters.amenities.includes(amenity)) {
      updateFilter('amenities', [...filters.amenities, amenity]);
    }
  };

  const removeAmenity = (amenity: string) => {
    updateFilter('amenities', filters.amenities.filter(a => a !== amenity));
  };

  const clearAllFilters = () => {
    onFiltersChange({
      category: '',
      priceRange: [0, 200],
      amenities: [],
      workEnvironment: '',
      location: ''
    });
  };

  const hasActiveFilters = filters.category || filters.amenities.length > 0 || filters.workEnvironment || filters.priceRange[0] > 0 || filters.priceRange[1] < 200 || filters.location;

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-lg">Filtri</h3>
      
      {/* Location Search */}
      <div>
        <label className="block text-sm font-medium mb-2">Posizione</label>
        <GeographicSearch
          placeholder="Cerca città o indirizzo..."
          onLocationSelect={handleLocationSelect}
          className="w-full"
        />
        {filters.location && (
          <Badge variant="secondary" className="mt-2 gap-1">
            {filters.location}
            <X className="h-3 w-3 cursor-pointer" onClick={() => updateFilter('location', '')} />
          </Badge>
        )}
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {/* Category Filter */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <Filter className="h-4 w-4 mr-2" />
              Categoria
              {filters.category && <Badge variant="secondary" className="ml-2">{filters.category}</Badge>}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => updateFilter('category', '')}>
              Tutte le categorie
            </DropdownMenuItem>
            {CATEGORY_OPTIONS.map(cat => (
              <DropdownMenuItem 
                key={cat.value} 
                onClick={() => updateFilter('category', cat.value)}
              >
                {cat.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Price Range Filter */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              Prezzo: €{filters.priceRange[0]}-{filters.priceRange[1]}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-64 p-4">
            <div className="space-y-4">
              <label className="text-sm font-medium">Prezzo per ora</label>
              <Slider
                value={filters.priceRange}
                onValueChange={(value) => updateFilter('priceRange', value)}
                max={200}
                min={0}
                step={5}
                className="w-full"
              />
              <div className="flex justify-between text-sm text-gray-600">
                <span>€{filters.priceRange[0]}</span>
                <span>€{filters.priceRange[1]}</span>
              </div>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Amenities Filter */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              Servizi
              {filters.amenities.length > 0 && (
                <Badge variant="secondary" className="ml-2">{filters.amenities.length}</Badge>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-64">
            {AMENITIES_OPTIONS.map(amenity => (
              <DropdownMenuCheckboxItem
                key={amenity}
                checked={filters.amenities.includes(amenity)}
                onCheckedChange={(checked) => {
                  if (checked) {
                    addAmenity(amenity);
                  } else {
                    removeAmenity(amenity);
                  }
                }}
              >
                {amenity}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Work Environment Filter */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              Ambiente
              {filters.workEnvironment && <Badge variant="secondary" className="ml-2">{filters.workEnvironment}</Badge>}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => updateFilter('workEnvironment', '')}>
              Tutti gli ambienti
            </DropdownMenuItem>
            {WORK_ENVIRONMENT_OPTIONS.map(env => (
              <DropdownMenuItem 
                key={env.value} 
                onClick={() => updateFilter('workEnvironment', env.value)}
              >
                {env.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Active Filters Display */}
        {filters.amenities.map(amenity => (
          <Badge key={amenity} variant="secondary" className="gap-1">
            {amenity}
            <X className="h-3 w-3 cursor-pointer" onClick={() => removeAmenity(amenity)} />
          </Badge>
        ))}

        {/* Clear All Filters */}
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearAllFilters}>
            <X className="h-4 w-4 mr-1" />
            Rimuovi filtri
          </Button>
        )}
      </div>
    </div>
  );
};
