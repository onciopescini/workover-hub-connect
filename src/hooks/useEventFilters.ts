import { useState } from "react";

export interface FilterState {
  city: string;
  category: string;
  dateRange: { from: string; to?: string } | null;
  coordinates: { lat: number; lng: number } | null;
}

export const useEventFilters = () => {
  const [cityFilter, setCityFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [dateFromFilter, setDateFromFilter] = useState("");
  const [dateToFilter, setDateToFilter] = useState("");
  const [coordinatesFilter, setCoordinatesFilter] = useState<{ lat: number; lng: number } | null>(null);

  const currentFilters: FilterState = {
    city: cityFilter,
    category: categoryFilter,
    dateRange: dateFromFilter || dateToFilter ? {
      from: dateFromFilter,
      ...(dateToFilter ? { to: dateToFilter } : {})
    } : null,
    coordinates: coordinatesFilter
  };

  const handleFiltersChange = (newFilters: FilterState) => {
    setCityFilter(newFilters.city);
    setCategoryFilter(newFilters.category);
    
    if (newFilters.dateRange) {
      setDateFromFilter(newFilters.dateRange.from);
      setDateToFilter(newFilters.dateRange.to ?? '');
    } else {
      setDateFromFilter('');
      setDateToFilter('');
    }
    
    setCoordinatesFilter(newFilters.coordinates);
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