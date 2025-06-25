
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/OptimizedAuthContext";
import { BookingWithDetails } from "@/types/booking";
import { BookingFilter } from "./useBookingFilters";
import { fetchCoworkerBookings, fetchHostBookings } from "./useBookingDataFetcher";
import { 
  transformCoworkerBookings, 
  transformHostBookings, 
  applySearchFilter, 
  removeDuplicateBookings 
} from "./useBookingTransforms";

// Main enhanced bookings query hook
export const useEnhancedBookings = (filters?: BookingFilter) => {
  const { authState } = useAuth();
  
  return useQuery({
    queryKey: ['enhanced-bookings', authState.user?.id, authState.profile?.role, filters],
    queryFn: async (): Promise<BookingWithDetails[]> => {
      const userId = authState.user?.id;
      const userRole = authState.profile?.role;
      
      if (!userId) {
        throw new Error('User ID not available');
      }

      console.log('🔍 Fetching enhanced bookings for user:', userId, 'role:', userRole);

      try {
        // Fetch both coworker and host bookings in parallel
        const [coworkerData, hostData] = await Promise.all([
          fetchCoworkerBookings(userId, filters),
          fetchHostBookings(userId, userRole, filters)
        ]);

        // Transform the data
        const transformedCoworkerBookings = transformCoworkerBookings(coworkerData);
        const transformedHostBookings = transformHostBookings(hostData);

        // Combine and remove duplicates
        const allBookings = [...transformedCoworkerBookings, ...transformedHostBookings];
        const uniqueBookings = removeDuplicateBookings(allBookings);

        // Apply search filter if provided
        const filteredBookings = applySearchFilter(uniqueBookings, filters?.searchTerm || '');

        console.log('✅ Successfully fetched', filteredBookings.length, 'enhanced bookings');
        return filteredBookings;

      } catch (error) {
        console.error('❌ Error fetching enhanced bookings:', error);
        throw error;
      }
    },
    enabled: !!authState.user?.id,
    staleTime: 30000, // 30 seconds
    refetchOnWindowFocus: true,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
};
