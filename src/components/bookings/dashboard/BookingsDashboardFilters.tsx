
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Filter, Search } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePickerWithRange } from '@/components/ui/date-range-picker';
import { format } from 'date-fns';
import { BookingFilter } from '@/hooks/queries/useEnhancedBookingsQuery';

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
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Filter className="w-5 h-5" />
          Filtri e Ricerca
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Cerca per spazio, indirizzo o ospite..."
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-10"
            />
          </div>

          <Select onValueChange={onStatusFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Stato prenotazione" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tutti gli stati</SelectItem>
              <SelectItem value="pending">In attesa</SelectItem>
              <SelectItem value="confirmed">Confermate</SelectItem>
              <SelectItem value="cancelled">Cancellate</SelectItem>
            </SelectContent>
          </Select>

          <DatePickerWithRange 
            onDateChange={(range) => {
              if (range?.start && range?.end) {
                onDateRangeFilter({
                  start: format(range.start, 'yyyy-MM-dd'),
                  end: format(range.end, 'yyyy-MM-dd')
                });
              } else {
                onDateRangeFilter(undefined);
              }
            }}
          />

          <Button variant="outline" onClick={onClearFilters}>
            Azzera Filtri
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
