import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { BookingReviewWithDetails } from '@/types/review';
import { sreLogger } from '@/lib/sre-logger';
import { TIME_CONSTANTS } from "@/constants";

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
          space:workspaces(
            title:name,
            address
          )
        )
      `)
      .eq('target_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Transform booking space data if necessary (mapping name->title)
    const transformedData = (data || []).map(review => ({
      ...review,
      booking: review.booking ? {
        ...review.booking,
        space: review.booking.space ? {
          title: (review.booking.space as any).title || (review.booking.space as any).name || 'Unknown Space',
          address: review.booking.space.address
        } : { title: 'Unknown', address: '' }
      } : null
    }));

    return transformedData as BookingReviewWithDetails[];
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
          space:workspaces(
            title:name,
            address
          )
        )
      `)
      .eq('author_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Transform booking space data
    const transformedData = (data || []).map(review => ({
      ...review,
      booking: review.booking ? {
        ...review.booking,
        space: review.booking.space ? {
          title: (review.booking.space as any).title || (review.booking.space as any).name || 'Unknown Space',
          address: review.booking.space.address
        } : { title: 'Unknown', address: '' }
      } : null
    }));

    return transformedData as BookingReviewWithDetails[];
  } catch (error) {
    sreLogger.error('Failed to fetch given reviews', { userId }, error as Error);
    throw error;
  }
};

// Hook
export const useBookingReviews = (userId?: string) => {
  const enabled = !!userId;

  const receivedQuery = useQuery({
    queryKey: ['booking-reviews-received', userId],
    queryFn: () => getUserReceivedReviews(userId!),
    enabled,
    staleTime: TIME_CONSTANTS.CACHE_DURATION,
  });

  const givenQuery = useQuery({
    queryKey: ['booking-reviews-given', userId],
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
