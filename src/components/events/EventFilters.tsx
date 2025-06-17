import React from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Filter, Calendar, X } from 'lucide-react';
import { GeographicSearch } from '@/components/shared/GeographicSearch';
import { Badge } from '@/components/ui/badge';

// Tipi semplificati per evitare dipendenze circolari
type FilterState = {
  city: string;
  category: string;
  dateRange: { from: string; to?: string } | null;
};

interface EventFiltersProps {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
}

export const EventFilters: React.FC<EventFiltersProps> = ({ filters, onFiltersChange }) => {
  const handleLocationSelect = (location: string, coordinates?: { lat: number; lng: number }) => {
    onFiltersChange({ 
      ...filters, 
      city: location,
      coordinates
    });
  };

  const updateCategory = (category: string) => {
    onFiltersChange({ ...filters, category });
  };

  const setDateRange = (range: string) => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);

    let dateRange: { from: string; to?: string } | null = null;

    switch (range) {
      case 'today':
        dateRange = { from: today.toISOString() };
        break;
      case 'tomorrow':
        dateRange = { from: tomorrow.toISOString() };
        break;
      case 'week':
        dateRange = { from: today.toISOString(), to: nextWeek.toISOString() };
        break;
      default:
        dateRange = null;
    }

    onFiltersChange({ ...filters, dateRange });
  };

  const clearAllFilters = () => {
    onFiltersChange({
      city: '',
      category: '',
      dateRange: null
    });
  };

  const hasActiveFilters = filters.city || filters.category || filters.dateRange;

  const formatDateRange = () => {
    if (!filters.dateRange) return 'Tutte le date';
    
    const from = new Date(filters.dateRange.from);
    if (filters.dateRange.to) {
      const to = new Date(filters.dateRange.to);
      return `${from.toLocaleDateString('it-IT')} - ${to.toLocaleDateString('it-IT')}`;
    }
    return from.toLocaleDateString('it-IT');
  };

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
        {filters.city && (
          <Badge variant="secondary" className="mt-2 gap-1">
            {filters.city}
            <X className="h-3 w-3 cursor-pointer" onClick={() => onFiltersChange({ ...filters, city: '' })} />
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
          <DropdownMenuContent className="w-full">
            <DropdownMenuItem onClick={() => updateCategory('')}>
              Tutte le categorie
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => updateCategory('networking')}>
              Networking
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => updateCategory('workshop')}>
              Workshop
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => updateCategory('conference')}>
              Conference
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => updateCategory('social')}>
              Social
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Date Range Filter */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <Calendar className="h-4 w-4 mr-2" />
              {formatDateRange()}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => setDateRange('')}>
              Tutte le date
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setDateRange('today')}>
              Oggi
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setDateRange('tomorrow')}>
              Domani
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setDateRange('week')}>
              Prossimi 7 giorni
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

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
