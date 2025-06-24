
import React from 'react';
import { Input } from '@/components/ui/input';
import { Search, Calendar } from 'lucide-react';

interface BookingFiltersProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  dateFilter: string;
  onDateFilterChange: (value: string) => void;
}

export function BookingFilters({ 
  searchTerm, 
  onSearchChange, 
  dateFilter, 
  onDateFilterChange 
}: BookingFiltersProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
        <Input
          placeholder="Cerca per spazio o indirizzo..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10"
        />
      </div>
      
      <div className="relative">
        <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
        <Input
          type="month"
          placeholder="Filtra per mese..."
          value={dateFilter}
          onChange={(e) => onDateFilterChange(e.target.value)}
          className="pl-10"
        />
      </div>
    </div>
  );
}
