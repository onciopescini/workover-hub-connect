
import React from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Filter, Calendar, MapPin } from 'lucide-react';

// Local types to avoid circular dependencies
type EventFilters = {
  city: string;
  category: string;
  dateRange: { from: string; to?: string } | null;
};

interface EventFiltersProps {
  filters: EventFilters;
  onFiltersChange: (filters: EventFilters) => void;
}

export const EventFilters: React.FC<EventFiltersProps> = ({ filters, onFiltersChange }) => {
  const updateCity = (city: string) => {
    onFiltersChange({ ...filters, city });
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
      
      {/* City Filter */}
      <div>
        <label className="block text-sm font-medium mb-2">
          <MapPin className="h-4 w-4 inline mr-1" />
          Città
        </label>
        <Input
          placeholder="Cerca per città..."
          value={filters.city}
          onChange={(e) => updateCity(e.target.value)}
        />
      </div>

      {/* Category Filter */}
      <div>
        <label className="block text-sm font-medium mb-2">
          <Filter className="h-4 w-4 inline mr-1" />
          Categoria
        </label>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="w-full justify-start">
              {filters.category || 'Tutte le categorie'}
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
      </div>

      {/* Date Range Filter */}
      <div>
        <label className="block text-sm font-medium mb-2">
          <Calendar className="h-4 w-4 inline mr-1" />
          Data
        </label>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="w-full justify-start">
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
      </div>

      {/* Clear All Filters */}
      {hasActiveFilters && (
        <Button variant="ghost" onClick={clearAllFilters} className="w-full">
          Rimuovi tutti i filtri
        </Button>
      )}
    </div>
  );
};
