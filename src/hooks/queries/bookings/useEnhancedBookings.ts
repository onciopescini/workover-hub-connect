
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
      
      console.log('🔍 Enhanced bookings query started:', {
        userId,
        userRole,
        filters
      });
      
      if (!userId) {
        console.log('❌ No user ID available');
        throw new Error('User ID not available');
      }

      try {
        // Fetch both coworker and host bookings in parallel
        console.log('🔍 Fetching coworker and host bookings...');
        const [coworkerData, hostData] = await Promise.all([
          fetchCoworkerBookings(userId, filters),
          fetchHostBookings(userId, userRole, filters)
        ]);

        console.log('✅ Raw data fetched:', {
          coworkerBookings: coworkerData?.length || 0,
          hostBookings: hostData?.length || 0
        });

        // Transform the data
        const transformedCoworkerBookings = transformCoworkerBookings(coworkerData);
        const transformedHostBookings = transformHostBookings(hostData);

        console.log('✅ Data transformed:', {
          transformedCoworkerBookings: transformedCoworkerBookings.length,
          transformedHostBookings: transformedHostBookings.length
        });

        // Combine and remove duplicates
        const allBookings = [...transformedCoworkerBookings, ...transformedHostBookings];
        const uniqueBookings = removeDuplicateBookings(allBookings);

        console.log('🔧 After deduplication:', uniqueBookings.length);

        // Apply search filter if provided
        const filteredBookings = applySearchFilter(uniqueBookings, filters?.searchTerm || '');

        console.log('✅ Final bookings count:', filteredBookings.length);
        
        // Debug: Log sample booking data
        if (filteredBookings.length > 0) {
          console.log('📋 Sample booking:', {
            id: filteredBookings[0].id,
            spaceTitle: filteredBookings[0].space?.title,
            status: filteredBookings[0].status,
            userId: filteredBookings[0].user_id,
            spaceHostId: filteredBookings[0].space?.host_id
          });
        }

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
