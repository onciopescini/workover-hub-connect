
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
        return [];
      }

      try {
        // Fetch only coworker bookings (bookings made by the user)
        const coworkerData = await fetchCoworkerBookings(userId, filters);
        
        console.log('✅ Coworker bookings fetched:', coworkerData?.length || 0);

        // Transform the data with error handling
        const transformedBookings = transformCoworkerBookings(coworkerData);
        console.log('✅ Coworker bookings transformed:', transformedBookings.length);

        // Apply search filter if provided
        const filteredBookings = applySearchFilter(transformedBookings, filters?.searchTerm || '');

        console.log('✅ Final coworker bookings count:', filteredBookings.length);
        
        return filteredBookings;

      } catch (error) {
        console.error('❌ Error fetching coworker bookings:', error);
        // Return empty array instead of throwing to prevent UI crashes
        return [];
      }
    },
    enabled: !!authState.user?.id,
    staleTime: 30000,
    refetchOnWindowFocus: false, // Reduced aggressive refetching
    retry: 1, // Reduced retry attempts
    retryDelay: 2000,
    // Add error handling
    meta: {
      onError: (error: Error) => {
        console.error('🚨 Coworker bookings query error:', error);
      }
    }
  });
};
