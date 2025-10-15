
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/auth/useAuth";
import { useLogger } from "@/hooks/useLogger";
import { BookingWithDetails } from "@/types/booking";
import { BookingFilter } from "./useBookingFilters";
import { fetchCoworkerBookings, fetchHostBookings } from "./useBookingDataFetcher";
import { 
  transformCoworkerBookings, 
  transformHostBookings, 
  applySearchFilter, 
  removeDuplicateBookings 
} from "./useBookingTransforms";
import { handleRLSError } from '@/lib/rls-error-handler';
import { toast } from 'sonner';

// Main enhanced bookings query hook
export const useEnhancedBookings = (filters?: BookingFilter) => {
  const { authState } = useAuth();
  const { debug, error } = useLogger({ context: 'useEnhancedBookings' });
  
  return useQuery({
    queryKey: ['enhanced-bookings', authState.user?.id, authState.profile?.role, filters],
    queryFn: async (): Promise<BookingWithDetails[]> => {
      const userId = authState.user?.id;
      const userRole = authState.profile?.role;
      
      debug('Enhanced bookings query started', {
        operation: 'fetch_enhanced_bookings',
        userId,
        userRole,
        filters
      });
      
      if (!userId) {
        const errorMessage = 'User ID not available for enhanced bookings';
        error('Enhanced bookings validation failed', new Error(errorMessage), {
          operation: 'fetch_enhanced_bookings_validation'
        });
        throw new Error(errorMessage);
      }

      try {
        // Fetch both coworker and host bookings in parallel
        debug('Fetching coworker and host bookings in parallel', {
          operation: 'fetch_parallel_bookings',
          userId,
          userRole
        });
        
        const [coworkerData, hostData] = await Promise.all([
          fetchCoworkerBookings(userId, filters),
          fetchHostBookings(userId, userRole ?? '', filters)
        ]);

        debug('Raw booking data fetched successfully', {
          operation: 'fetch_parallel_bookings_success',
          coworkerBookings: coworkerData?.length || 0,
          hostBookings: hostData?.length || 0
        });

        // Transform the data
        const transformedCoworkerBookings = transformCoworkerBookings(coworkerData);
        const transformedHostBookings = transformHostBookings(hostData);

        debug('Booking data transformed successfully', {
          operation: 'transform_enhanced_bookings',
          transformedCoworkerBookings: transformedCoworkerBookings.length,
          transformedHostBookings: transformedHostBookings.length
        });

        // Combine and remove duplicates
        const allBookings = [...transformedCoworkerBookings, ...transformedHostBookings];
        const uniqueBookings = removeDuplicateBookings(allBookings);

        debug('Booking data deduplicated', {
          operation: 'deduplicate_enhanced_bookings',
          totalBeforeDedup: allBookings.length,
          uniqueBookings: uniqueBookings.length
        });

        // Apply search filter if provided
        const filteredBookings = applySearchFilter(uniqueBookings, filters?.searchTerm || '');

        debug('Enhanced bookings filtered successfully', {
          operation: 'filter_enhanced_bookings',
          finalCount: filteredBookings.length,
          searchTerm: filters?.searchTerm
        });
        
        // Debug: Log sample booking data
        if (filteredBookings.length > 0) {
          const sample = filteredBookings[0];
          if (sample) {
            debug('Sample enhanced booking data', {
              operation: 'sample_enhanced_booking',
              bookingId: sample.id,
              spaceTitle: sample.space?.title,
              status: sample.status,
              userId: sample.user_id,
              spaceHostId: sample.space?.host_id
            });
          }
        }

        return filteredBookings;

      } catch (fetchError) {
        error('Error fetching enhanced bookings', fetchError as Error, {
          operation: 'fetch_enhanced_bookings_error',
          userId,
          userRole,
          filters
        });
        
        // Handle RLS errors with user-friendly messages
        const rlsResult = handleRLSError(fetchError);
        if (rlsResult.isRLSError && rlsResult.shouldShowToast) {
          toast.error('Accesso negato', {
            description: rlsResult.userMessage,
            duration: 5000,
          });
        }
        
        throw fetchError;
      }
    },
    enabled: !!authState.user?.id,
    staleTime: 30000, // 30 seconds
    refetchOnWindowFocus: true,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
};
