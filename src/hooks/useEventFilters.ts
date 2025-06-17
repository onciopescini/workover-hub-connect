
import { useState } from 'react';

interface EventFilters {
  city: string;
  category: string;
  dateRange: { from: string; to?: string } | null;
  coordinates?: { lat: number; lng: number } | null;
}

export const useEventFilters = () => {
  const [cityFilter, setCityFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [dateFromFilter, setDateFromFilter] = useState('');
  const [dateToFilter, setDateToFilter] = useState('');
  const [coordinatesFilter, setCoordinatesFilter] = useState<{ lat: number; lng: number } | null>(null);

  const handleFiltersChange = (newFilters: EventFilters) => {
    console.log('Filters changed:', newFilters);
    setCityFilter(newFilters.city || '');
    setCategoryFilter(newFilters.category || '');
    setCoordinatesFilter(newFilters.coordinates || null);
    
    if (newFilters.dateRange) {
      setDateFromFilter(newFilters.dateRange.from || '');
      setDateToFilter(newFilters.dateRange.to || '');
    } else {
      setDateFromFilter('');
      setDateToFilter('');
    }
  };

  const currentFilters = {
    city: cityFilter,
    category: categoryFilter,
    dateRange: dateFromFilter ? { from: dateFromFilter, to: dateToFilter || undefined } : null,
    coordinates: coordinatesFilter,
  };

  return {
    cityFilter,
    categoryFilter,
    dateFromFilter,
    dateToFilter,
    coordinatesFilter,
    currentFilters,
    handleFiltersChange
  };
};
