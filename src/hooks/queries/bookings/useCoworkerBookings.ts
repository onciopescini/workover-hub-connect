
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/auth/useAuth";
import { useLogger } from "@/hooks/useLogger";
import { BookingWithDetails } from "@/types/booking";
import { BookingFilter } from "./useBookingFilters";
import { fetchCoworkerBookings } from "./useBookingDataFetcher";
import { transformCoworkerBookings, applySearchFilter } from "./useBookingTransforms";

export const useCoworkerBookings = (filters?: BookingFilter) => {
  const { authState } = useAuth();
  const { debug, error } = useLogger({ context: 'useCoworkerBookings' });
  
  return useQuery({
    queryKey: ['coworker-bookings', authState.user?.id, filters],
    queryFn: async (): Promise<BookingWithDetails[]> => {
      const userId = authState.user?.id;
      
      debug('Coworker bookings query started', {
        operation: 'fetch_coworker_bookings',
        userId,
        filters
      });
      
      if (!userId) {
        debug('No user ID available for coworker bookings', {
          operation: 'fetch_coworker_bookings_validation'
        });
        return [];
      }

      try {
        // Fetch only coworker bookings (bookings made by the user)
        const coworkerData = await fetchCoworkerBookings(userId, filters);
        
        debug('Coworker bookings fetched successfully', {
          operation: 'fetch_coworker_bookings_success',
          count: coworkerData?.length || 0,
          userId
        });

        // Transform the data with error handling
        const transformedBookings = transformCoworkerBookings(coworkerData);
        
        debug('Coworker bookings transformed successfully', {
          operation: 'transform_coworker_bookings',
          transformedCount: transformedBookings.length,
          originalCount: coworkerData?.length || 0
        });

        // Apply search filter if provided
        const filteredBookings = applySearchFilter(transformedBookings, filters?.searchTerm || '');

        debug('Coworker bookings filtered successfully', {
          operation: 'filter_coworker_bookings',
          finalCount: filteredBookings.length,
          searchTerm: filters?.searchTerm
        });
        
        return filteredBookings;

      } catch (fetchError) {
        error('Error fetching coworker bookings', fetchError as Error, {
          operation: 'fetch_coworker_bookings_error',
          userId,
          filters
        });
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
      onError: (queryError: Error) => {
        error('Coworker bookings query error', queryError, {
          operation: 'coworker_bookings_query_error',
          userId: authState.user?.id
        });
      }
    }
  });
};
