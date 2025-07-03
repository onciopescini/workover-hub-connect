
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/auth/useAuth";
import { BookingWithDetails } from "@/types/booking";
import { BookingFilter } from "./useBookingFilters";
import { fetchHostBookings } from "./useBookingDataFetcher";
import { transformHostBookings, applySearchFilter } from "./useBookingTransforms";

export const useHostBookings = (filters?: BookingFilter) => {
  const { authState } = useAuth();
  
  return useQuery({
    queryKey: ['host-bookings', authState.user?.id, authState.profile?.role, filters],
    queryFn: async (): Promise<BookingWithDetails[]> => {
      const userId = authState.user?.id;
      const userRole = authState.profile?.role;
      
      console.log('🔍 Host bookings query started:', {
        userId,
        userRole,
        filters
      });
      
      if (!userId) {
        console.log('❌ No user ID available');
        return [];
      }

      if (userRole !== 'host' && userRole !== 'admin') {
        console.log('❌ User is not a host or admin, returning empty array');
        return [];
      }

      try {
        // Fetch only host bookings (bookings received on user's spaces)
        const hostData = await fetchHostBookings(userId, userRole, filters);
        
        console.log('✅ Host bookings fetched:', hostData?.length || 0);

        // Transform the data with error handling
        const transformedBookings = transformHostBookings(hostData);
        console.log('✅ Host bookings transformed:', transformedBookings.length);

        // Apply search filter if provided
        const filteredBookings = applySearchFilter(transformedBookings, filters?.searchTerm || '');

        console.log('✅ Final host bookings count:', filteredBookings.length);
        
        return filteredBookings;

      } catch (error) {
        console.error('❌ Error fetching host bookings:', error);
        // Return empty array instead of throwing to prevent UI crashes
        return [];
      }
    },
    enabled: !!authState.user?.id && (authState.profile?.role === 'host' || authState.profile?.role === 'admin'),
    staleTime: 30000,
    refetchOnWindowFocus: false, // Reduced aggressive refetching
    retry: 1, // Reduced retry attempts
    retryDelay: 2000,
    // Add error handling
    meta: {
      onError: (error: Error) => {
        console.error('🚨 Host bookings query error:', error);
      }
    }
  });
};
