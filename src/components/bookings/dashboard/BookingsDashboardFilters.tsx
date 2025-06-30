
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Filter, X, Calendar } from 'lucide-react';
import { BookingFilter } from '@/hooks/queries/bookings/useBookingFilters';

interface BookingsDashboardFiltersProps {
  searchTerm: string;
  onSearchChange: (term: string) => void;
  filters: BookingFilter;
  onStatusFilter: (status: string) => void;
  onDateRangeFilter: (range: { start: string; end: string } | undefined) => void;
  onClearFilters: () => void;
}

export const BookingsDashboardFilters = ({
  searchTerm,
  onSearchChange,
  filters,
  onStatusFilter,
  onDateRangeFilter,
  onClearFilters
}: BookingsDashboardFiltersProps) => {
  const hasActiveFilters = searchTerm || filters.status || filters.dateRange;

  return (
    <Card className="mb-6">
      <CardContent className="p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0 lg:space-x-4">
          <div className="flex flex-1 space-x-4">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Cerca per spazio, indirizzo o persona..."
                value={searchTerm}
                onChange={(e) => onSearchChange(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Status Filter */}
            <Select value={filters.status || 'all'} onValueChange={onStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filtra per stato" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutti gli stati</SelectItem>
                <SelectItem value="pending">In attesa</SelectItem>
                <SelectItem value="confirmed">Confermate</SelectItem>
                <SelectItem value="cancelled">Cancellate</SelectItem>
              </SelectContent>
            </Select>

            {/* Date Range Filter */}
            <Button variant="outline" className="whitespace-nowrap">
              <Calendar className="w-4 h-4 mr-2" />
              Data
            </Button>
          </div>

          {/* Actions */}
          <div className="flex items-center space-x-2">
            {hasActiveFilters && (
              <>
                <Badge variant="secondary" className="px-3 py-1">
                  <Filter className="w-3 h-3 mr-1" />
                  Filtri attivi
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClearFilters}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="w-4 h-4 mr-1" />
                  Pulisci
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Active Filters Display */}
        {hasActiveFilters && (
          <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-gray-200">
            {searchTerm && (
              <Badge variant="outline" className="px-3 py-1">
                Ricerca: "{searchTerm}"
                <Button
                  variant="ghost"
                  size="sm"
                  className="ml-1 h-auto p-0 text-gray-500 hover:text-gray-700"
                  onClick={() => onSearchChange('')}
                >
                  <X className="w-3 h-3" />
                </Button>
              </Badge>
            )}
            {filters.status && (
              <Badge variant="outline" className="px-3 py-1">
                Stato: {filters.status}
                <Button
                  variant="ghost"
                  size="sm"
                  className="ml-1 h-auto p-0 text-gray-500 hover:text-gray-700"
                  onClick={() => onStatusFilter('all')}
                >
                  <X className="w-3 h-3" />
                </Button>
              </Badge>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
