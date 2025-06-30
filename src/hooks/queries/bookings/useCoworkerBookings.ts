
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/OptimizedAuthContext";
import { BookingWithDetails } from "@/types/booking";
import { BookingFilter } from "./useBookingFilters";
import { fetchCoworkerBookings } from "./useBookingDataFetcher";
import { transformCoworkerBookings, applySearchFilter } from "./useBookingTransforms";

export const useCoworkerBookings = (filters?: BookingFilter) => {
  const { authState } = useAuth();
  
  return useQuery({
    queryKey: ['coworker-bookings', authState.user?.id, filters],
    queryFn: async (): Promise<BookingWithDetails[]> => {
      const userId = authState.user?.id;
      
      console.log('🔍 Coworker bookings query started:', {
        userId,
        filters
      });
      
      if (!userId) {
        console.log('❌ No user ID available');
        throw new Error('User ID not available');
      }

      try {
        // Fetch only coworker bookings (bookings made by the user)
        const coworkerData = await fetchCoworkerBookings(userId, filters);
        
        console.log('✅ Coworker bookings fetched:', coworkerData?.length || 0);

        // Transform the data
        const transformedBookings = transformCoworkerBookings(coworkerData);

        // Apply search filter if provided
        const filteredBookings = applySearchFilter(transformedBookings, filters?.searchTerm || '');

        console.log('✅ Final coworker bookings count:', filteredBookings.length);
        
        return filteredBookings;

      } catch (error) {
        console.error('❌ Error fetching coworker bookings:', error);
        throw error;
      }
    },
    enabled: !!authState.user?.id,
    staleTime: 30000,
    refetchOnWindowFocus: true,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
};
