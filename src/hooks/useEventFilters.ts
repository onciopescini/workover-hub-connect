
import { useState } from 'react';

interface EventFilters {
  city: string;
  category: string;
  dateRange: { from: string; to?: string } | null;
}

export const useEventFilters = () => {
  const [cityFilter, setCityFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [dateFromFilter, setDateFromFilter] = useState('');
  const [dateToFilter, setDateToFilter] = useState('');

  const handleFiltersChange = (newFilters: EventFilters) => {
    console.log('Filters changed:', newFilters);
    setCityFilter(newFilters.city || '');
    setCategoryFilter(newFilters.category || '');
    
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
  };

  return {
    cityFilter,
    categoryFilter,
    dateFromFilter,
    dateToFilter,
    currentFilters,
    handleFiltersChange
  };
};
