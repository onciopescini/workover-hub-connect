
export interface EventFilters {
  city: string;
  category: string;
  dateRange: { from: string; to?: string } | null;
}

export interface EventFiltersProps {
  filters: EventFilters;
  onFiltersChange: (filters: EventFilters) => void;
}
