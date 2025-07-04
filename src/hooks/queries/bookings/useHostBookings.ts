
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/auth/useAuth";
import { useLogger } from "@/hooks/useLogger";
import { BookingWithDetails } from "@/types/booking";
import { BookingFilter } from "./useBookingFilters";
import { fetchHostBookings } from "./useBookingDataFetcher";
import { transformHostBookings, applySearchFilter } from "./useBookingTransforms";

export const useHostBookings = (filters?: BookingFilter) => {
  const { authState } = useAuth();
  const { debug, error } = useLogger({ context: 'useHostBookings' });
  
  return useQuery({
    queryKey: ['host-bookings', authState.user?.id, authState.profile?.role, filters],
    queryFn: async (): Promise<BookingWithDetails[]> => {
      const userId = authState.user?.id;
      const userRole = authState.profile?.role;
      
      debug('Host bookings query started', {
        operation: 'fetch_host_bookings',
        userId,
        userRole,
        filters
      });
      
      if (!userId) {
        debug('No user ID available for host bookings', {
          operation: 'fetch_host_bookings_validation'
        });
        return [];
      }

      if (userRole !== 'host' && userRole !== 'admin') {
        debug('User not authorized for host bookings', {
          operation: 'fetch_host_bookings_authorization',
          userRole,
          userId
        });
        return [];
      }

      try {
        // Fetch only host bookings (bookings received on user's spaces)
        const hostData = await fetchHostBookings(userId, userRole, filters);
        
        debug('Host bookings fetched successfully', {
          operation: 'fetch_host_bookings_success',
          count: hostData?.length || 0,
          userId,
          userRole
        });

        // Transform the data with error handling
        const transformedBookings = transformHostBookings(hostData);
        
        debug('Host bookings transformed successfully', {
          operation: 'transform_host_bookings',
          transformedCount: transformedBookings.length,
          originalCount: hostData?.length || 0
        });

        // Apply search filter if provided
        const filteredBookings = applySearchFilter(transformedBookings, filters?.searchTerm || '');

        debug('Host bookings filtered successfully', {
          operation: 'filter_host_bookings',
          finalCount: filteredBookings.length,
          searchTerm: filters?.searchTerm
        });
        
        return filteredBookings;

      } catch (fetchError) {
        error('Error fetching host bookings', fetchError as Error, {
          operation: 'fetch_host_bookings_error',
          userId,
          userRole,
          filters
        });
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
      onError: (queryError: Error) => {
        error('Host bookings query error', queryError, {
          operation: 'host_bookings_query_error',
          userId: authState.user?.id,
          userRole: authState.profile?.role
        });
      }
    }
  });
};
