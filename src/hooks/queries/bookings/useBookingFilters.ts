
import { useState } from 'react';

export type BookingFilter = {
  status?: 'pending' | 'confirmed' | 'cancelled';
  dateRange?: { start: string; end: string };
  spaceId?: string;
  searchTerm?: string;
};

export const useBookingFilters = () => {
  const [filters, setFilters] = useState<BookingFilter>({});

  const updateFilter = (key: keyof BookingFilter, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const clearFilters = () => {
    setFilters({});
  };

  const hasActiveFilters = () => {
    return Object.values(filters).some(value => value !== undefined);
  };

  return {
    filters,
    setFilters,
    updateFilter,
    clearFilters,
    hasActiveFilters
  };
};
