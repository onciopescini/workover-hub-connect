
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

interface EventFiltersProps {
  filters: {
    city: string;
    category: string;
    dateRange: { from: Date; to?: Date } | null;
  };
  onFiltersChange: (filters: {
    city: string;
    category: string;
    dateRange: { from: Date; to?: Date } | null;
  }) => void;
}

export const EventFilters: React.FC<EventFiltersProps> = ({ filters, onFiltersChange }) => {
  const updateFilter = (key: string, value: any) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const setDateRange = (range: string) => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);

    switch (range) {
      case 'today':
        updateFilter('dateRange', { from: today });
        break;
      case 'tomorrow':
        updateFilter('dateRange', { from: tomorrow });
        break;
      case 'week':
        updateFilter('dateRange', { from: today, to: nextWeek });
        break;
      default:
        updateFilter('dateRange', null);
    }
  };

  const clearAllFilters = () => {
    onFiltersChange({
      city: '',
      category: '',
      dateRange: null
    });
  };

  const hasActiveFilters = filters.city || filters.category || filters.dateRange;

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
          onChange={(e) => updateFilter('city', e.target.value)}
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
            <DropdownMenuItem onClick={() => updateFilter('category', '')}>
              Tutte le categorie
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => updateFilter('category', 'networking')}>
              Networking
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => updateFilter('category', 'workshop')}>
              Workshop
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => updateFilter('category', 'conference')}>
              Conference
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => updateFilter('category', 'social')}>
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
              {filters.dateRange ? 
                (filters.dateRange.to ? 
                  `${filters.dateRange.from.toLocaleDateString('it-IT')} - ${filters.dateRange.to.toLocaleDateString('it-IT')}` :
                  filters.dateRange.from.toLocaleDateString('it-IT')
                ) : 
                'Tutte le date'
              }
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
