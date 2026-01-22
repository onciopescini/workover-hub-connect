import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { BookingReviewWithDetails } from '@/types/review';
import { sreLogger } from '@/lib/sre-logger';
import { TIME_CONSTANTS } from "@/constants";
import { queryKeys } from "@/lib/react-query-config";
import type { BookingReviewJoin } from "@/types/supabase-joins";

// Fetcher functions
const getUserReceivedReviews = async (userId: string): Promise<BookingReviewWithDetails[]> => {
  if (!userId) return [];

  try {
    const { data, error } = await supabase
      .from('booking_reviews')
      .select(`
        *,
        author:profiles!booking_reviews_author_id_fkey(
          first_name,
          last_name,
          profile_photo_url
        ),
        target:profiles!booking_reviews_target_id_fkey(
          first_name,
          last_name,
          profile_photo_url
        ),
        booking:bookings!booking_reviews_booking_id_fkey(
          booking_date,
          spaces(
            title,
            address
          )
        )
      `)
      .eq('target_id', userId)
      .order('created_at', { ascending: false })
      .overrideTypes<BookingReviewJoin[]>();

    if (error) throw error;

    // Transform booking space data
    const transformedData = (data || []).map(review => {
      // Access the spaces data correctly, handling potential array or object return
      const spaceData = review.booking?.spaces;
      // In PostgREST, a belongs-to relationship (many-to-one) returns an object, not an array.
      // But we should cast safely.
      const spaceObj = Array.isArray(spaceData) ? spaceData[0] : spaceData;

      return {
        ...review,
        booking: review.booking ? {
          ...review.booking,
          space: spaceObj ? {
            title: spaceObj.title || 'Unknown Space',
            address: spaceObj.address
          } : { title: 'Unknown', address: '' }
        } : null
      };
    });

    return transformedData;
  } catch (error) {
    sreLogger.error('Failed to fetch received reviews', { userId }, error as Error);
    throw error;
  }
};

const getUserGivenReviews = async (userId: string): Promise<BookingReviewWithDetails[]> => {
  if (!userId) return [];

  try {
    const { data, error } = await supabase
      .from('booking_reviews')
      .select(`
        *,
        author:profiles!booking_reviews_author_id_fkey(
          first_name,
          last_name,
          profile_photo_url
        ),
        target:profiles!booking_reviews_target_id_fkey(
          first_name,
          last_name,
          profile_photo_url
        ),
        booking:bookings!booking_reviews_booking_id_fkey(
          booking_date,
          spaces(
            title,
            address
          )
        )
      `)
      .eq('author_id', userId)
      .order('created_at', { ascending: false })
      .overrideTypes<BookingReviewJoin[]>();

    if (error) throw error;

    // Transform booking space data
    const transformedData = (data || []).map(review => {
      const spaceData = review.booking?.spaces;
      const spaceObj = Array.isArray(spaceData) ? spaceData[0] : spaceData;

      return {
        ...review,
        booking: review.booking ? {
          ...review.booking,
          space: spaceObj ? {
            title: spaceObj.title || 'Unknown Space',
            address: spaceObj.address
          } : { title: 'Unknown', address: '' }
        } : null
      };
    });

    return transformedData;
  } catch (error) {
    sreLogger.error('Failed to fetch given reviews', { userId }, error as Error);
    throw error;
  }
};

// Hook
export const useBookingReviews = (userId?: string) => {
  const enabled = !!userId;

  const receivedQuery = useQuery({
    queryKey: queryKeys.bookingReviews.received(userId),
    queryFn: () => getUserReceivedReviews(userId!),
    enabled,
    staleTime: TIME_CONSTANTS.CACHE_DURATION,
  });

  const givenQuery = useQuery({
    queryKey: queryKeys.bookingReviews.given(userId),
    queryFn: () => getUserGivenReviews(userId!),
    enabled,
    staleTime: TIME_CONSTANTS.CACHE_DURATION,
  });

  return {
    received: receivedQuery.data || [],
    given: givenQuery.data || [],
    isLoading: receivedQuery.isLoading || givenQuery.isLoading,
    isError: receivedQuery.isError || givenQuery.isError,
    error: receivedQuery.error || givenQuery.error,
    refetch: () => {
      receivedQuery.refetch();
      givenQuery.refetch();
    }
  };
};
