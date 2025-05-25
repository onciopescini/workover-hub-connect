
import React from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
} from '@/components/ui/dropdown-menu';
import { Filter, Calendar, Users } from 'lucide-react';

interface EventFiltersProps {
  filters: {
    dateRange: string;
    eventType: string;
    hasAvailability: boolean;
  };
  onFiltersChange: (filters: any) => void;
}

export const EventFilters: React.FC<EventFiltersProps> = ({ filters, onFiltersChange }) => {
  const updateFilter = (key: string, value: any) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  return (
    <div className="flex items-center gap-2">
      {/* Date Range Filter */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm">
            <Calendar className="h-4 w-4 mr-2" />
            {filters.dateRange ? 
              (filters.dateRange === 'today' ? 'Oggi' :
               filters.dateRange === 'tomorrow' ? 'Domani' :
               filters.dateRange === 'week' ? 'Questa settimana' : 'Data') 
              : 'Data'}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem onClick={() => updateFilter('dateRange', '')}>
            Tutte le date
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => updateFilter('dateRange', 'today')}>
            Oggi
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => updateFilter('dateRange', 'tomorrow')}>
            Domani
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => updateFilter('dateRange', 'week')}>
            Questa settimana
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Availability Filter */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm">
            <Users className="h-4 w-4 mr-2" />
            Disponibilità
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuCheckboxItem
            checked={filters.hasAvailability}
            onCheckedChange={(checked) => updateFilter('hasAvailability', checked)}
          >
            Solo eventi con posti disponibili
          </DropdownMenuCheckboxItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};
