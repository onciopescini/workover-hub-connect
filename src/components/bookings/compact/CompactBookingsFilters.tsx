import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, SlidersHorizontal, X, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CompactBookingsFiltersProps {
  searchTerm: string;
  onSearchChange: (term: string) => void;
  filters: {
    status?: 'pending' | 'confirmed' | 'cancelled';
    dateRange?: { start: string; end: string };
  };
  onStatusFilter: (status: 'pending' | 'confirmed' | 'cancelled' | null) => void;
  onDateRangeFilter: (range: { start: string; end: string } | null | undefined) => void;
  onClearFilters: () => void;
}

export const CompactBookingsFilters: React.FC<CompactBookingsFiltersProps> = ({
  searchTerm,
  onSearchChange,
  filters,
  onStatusFilter,
  onDateRangeFilter,
  onClearFilters
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const activeFiltersCount = [
    filters.status,
    filters.dateRange
  ].filter(Boolean).length;

  const hasDateRange = !!filters.dateRange;

  return (
    <div className="sticky top-[48px] z-20 bg-background border-b shadow-sm">
      <div className="px-4 py-3">
        {/* Main Row */}
        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cerca per spazio, coworker, data..."
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Toggle Advanced Filters */}
          <Button
            variant={isExpanded ? "default" : "outline"}
            onClick={() => setIsExpanded(!isExpanded)}
            className="relative"
          >
            <SlidersHorizontal className="h-4 w-4 mr-2" />
            Filtri
            {activeFiltersCount > 0 && (
              <Badge variant="destructive" className="ml-2 px-1.5 py-0 text-xs">
                {activeFiltersCount}
              </Badge>
            )}
          </Button>
        </div>

        {/* Expanded Filters */}
        <div
          className={cn(
            "overflow-hidden transition-all duration-300",
            isExpanded ? "max-h-32 opacity-100 mt-3" : "max-h-0 opacity-0"
          )}
        >
          <div className="flex items-center gap-3 flex-wrap">
            {/* Status Filters */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Stato:</span>
              <Button
                variant={filters.status === 'pending' ? 'default' : 'outline'}
                size="sm"
                onClick={() => onStatusFilter(filters.status === 'pending' ? null : 'pending')}
              >
                In attesa
              </Button>
              <Button
                variant={filters.status === 'confirmed' ? 'default' : 'outline'}
                size="sm"
                onClick={() => onStatusFilter(filters.status === 'confirmed' ? null : 'confirmed')}
              >
                Confermate
              </Button>
              <Button
                variant={filters.status === 'cancelled' ? 'default' : 'outline'}
                size="sm"
                onClick={() => onStatusFilter(filters.status === 'cancelled' ? null : 'cancelled')}
              >
                Annullate
              </Button>
            </div>

            {/* Date Range - Simplified */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Periodo:</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  // TODO: Implement date picker dialog
                  console.log('Open date picker');
                }}
              >
                <Calendar className="h-4 w-4 mr-2" />
                Seleziona periodo
              </Button>
              {hasDateRange && (
                <Badge variant="secondary">
                  Data selezionata
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDateRangeFilter(null)}
                    className="h-4 w-4 p-0 ml-1"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </Badge>
              )}
            </div>

            {/* Clear All */}
            {activeFiltersCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onClearFilters}
                className="text-destructive"
              >
                <X className="h-4 w-4 mr-1" />
                Cancella filtri
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
