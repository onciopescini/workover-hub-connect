
export interface EventFilters {
  city: string;
  category: string;
  dateRange: { from: Date; to?: Date } | null;
}

export interface EventFiltersProps {
  filters: EventFilters;
  onFiltersChange: (filters: EventFilters) => void;
}
