import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { BookingReviewWithDetails, BookingReviewInsert, ReviewStatus } from "@/types/review";
import { sreLogger } from '@/lib/sre-logger';

// Get booking reviews for a user
export const getBookingReviews = async (userId: string): Promise<{
  given: BookingReviewWithDetails[];
  received: BookingReviewWithDetails[];
}> => {
  try {
    // Reviews given by the user
    const { data: givenReviews, error: givenError } = await supabase
      .from("booking_reviews")
      .select(`
        *,
        author:profiles!author_id (
          first_name,
          last_name,
          profile_photo_url
        ),
        target:profiles!target_id (
          first_name,
          last_name,
          profile_photo_url
        ),
        booking:bookings!booking_id (
          booking_date,
          space:spaces!space_id (
            title,
            address
          )
        )
      `)
      .eq("author_id", userId);

    if (givenError) throw givenError;

    // Reviews received by the user
    const { data: receivedReviews, error: receivedError } = await supabase
      .from("booking_reviews")
      .select(`
        *,
        author:profiles!author_id (
          first_name,
          last_name,
          profile_photo_url
        ),
        target:profiles!target_id (
          first_name,
          last_name,
          profile_photo_url
        ),
        booking:bookings!booking_id (
          booking_date,
          space:spaces!space_id (
            title,
            address
          )
        )
      `)
      .eq("target_id", userId);

    if (receivedError) throw receivedError;

    return {
      given: givenReviews as BookingReviewWithDetails[] || [],
      received: receivedReviews as BookingReviewWithDetails[] || [],
    };
  } catch (error) {
    sreLogger.error('Error fetching booking reviews', { userId }, error as Error);
    return { given: [], received: [] };
  }
};

// Add a booking review
export const addBookingReview = async (review: BookingReviewInsert): Promise<boolean> => {
  try {
    const { error } = await supabase.from("booking_reviews").insert(review);

    if (error) {
      toast.error("Errore nell'invio della recensione");
      sreLogger.error('Error adding booking review', { review }, error as Error);
      return false;
    }

    toast.success("Recensione inviata con successo");
    return true;
  } catch (error) {
    sreLogger.error('Error adding booking review', { review }, error as Error);
    toast.error("Errore nell'invio della recensione");
    return false;
  }
};

// Check review status for a booking
export const getBookingReviewStatus = async (bookingId: string, userId: string, targetId: string): Promise<ReviewStatus> => {
  try {
    // Get booking details to check completion status and payment
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select(`
        *,
        payments (
          payment_status
        )
      `)
      .eq("id", bookingId)
      .maybeSingle();

    if (bookingError || !booking) {
      sreLogger.error('Error fetching booking', { bookingId }, bookingError as Error | undefined);
      return {
        canWriteReview: false,
        hasWrittenReview: false,
        hasReceivedReview: false,
        isVisible: false
      };
    }

    // Check if booking is completed (date + end_time has passed)
    const bookingEndTime = new Date(`${booking.booking_date}T${booking.end_time || '18:00:00'}`);
    const isBookingCompleted = bookingEndTime < new Date();

    // Check if payment is completed
    const isPaymentCompleted = booking.payments?.some((payment: any) => payment.payment_status === 'completed') || false;

    // Check if user has written a review
    const { data: userReview } = await supabase
      .from("booking_reviews")
      .select("*")
      .eq("booking_id", bookingId)
      .eq("author_id", userId)
      .eq("target_id", targetId)
      .maybeSingle();

    // Check if target has written a review
    const { data: targetReview } = await supabase
      .from("booking_reviews")
      .select("*")
      .eq("booking_id", bookingId)
      .eq("author_id", targetId)
      .eq("target_id", userId)
      .maybeSingle();

    const hasWrittenReview = !!userReview;
    const hasReceivedReview = !!targetReview;
    const isVisible = userReview?.is_visible || false;

    let daysUntilVisible: number | undefined;
    if (userReview && !isVisible && userReview.created_at) {
      const daysSinceCreation = Math.floor(
        (Date.now() - new Date(userReview.created_at).getTime()) / (1000 * 60 * 60 * 24)
      );
      daysUntilVisible = Math.max(0, 14 - daysSinceCreation);
    }

    const result: ReviewStatus = {
      canWriteReview: !hasWrittenReview && isBookingCompleted && isPaymentCompleted,
      hasWrittenReview,
      hasReceivedReview,
      isVisible
    };

    if (daysUntilVisible !== undefined) {
      result.daysUntilVisible = daysUntilVisible;
    }

    return result;
  } catch (error) {
    sreLogger.error('Error getting booking review status', { bookingId, userId, targetId }, error as Error);
    return {
      canWriteReview: false,
      hasWrittenReview: false,
      hasReceivedReview: false,
      isVisible: false
    };
  }
};

// Get user's average rating from received booking reviews
export const getUserAverageRating = async (userId: string): Promise<number | null> => {
  try {
    const { data, error } = await supabase
      .from('booking_reviews')
      .select('rating')
      .eq('target_id', userId)
      .eq('is_visible', true);

    if (error) {
      sreLogger.error('Error fetching user average rating', { userId }, error as Error);
      return null;
    }

    if (!data || data.length === 0) {
      return null;
    }

    const total = data.reduce((sum, review) => sum + review.rating, 0);
    return total / data.length;
  } catch (error) {
    sreLogger.error('Error calculating average rating', { userId }, error as Error);
    return null;
  }
};