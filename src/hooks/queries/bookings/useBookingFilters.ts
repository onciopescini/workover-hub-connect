export interface BookingFilter {
  status?: 'pending' | 'confirmed' | 'cancelled';
  dateRange?: {
    start: string;
    end: string;
  };
  searchTerm?: string;
}

export const useBookingFilters = () => {
  // Hook per gestire filtri avanzati
  return {
    // Placeholder per future implementazioni
  };
};
