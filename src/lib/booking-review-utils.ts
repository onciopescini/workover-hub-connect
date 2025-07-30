import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { BookingReviewWithDetails, BookingReviewInsert, ReviewStatus } from "@/types/review";

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
    console.error("Error fetching booking reviews:", error);
    return { given: [], received: [] };
  }
};

// Add a booking review
export const addBookingReview = async (review: BookingReviewInsert): Promise<boolean> => {
  try {
    const { error } = await supabase.from("booking_reviews").insert(review);

    if (error) {
      toast.error("Errore nell'invio della recensione");
      console.error(error);
      return false;
    }

    toast.success("Recensione inviata con successo");
    return true;
  } catch (error) {
    console.error("Error adding booking review:", error);
    toast.error("Errore nell'invio della recensione");
    return false;
  }
};

// Check review status for a booking
export const getBookingReviewStatus = async (bookingId: string, userId: string, targetId: string): Promise<ReviewStatus> => {
  try {
    // Check if user has written a review
    const { data: userReview } = await supabase
      .from("booking_reviews")
      .select("*")
      .eq("booking_id", bookingId)
      .eq("author_id", userId)
      .eq("target_id", targetId)
      .single();

    // Check if target has written a review
    const { data: targetReview } = await supabase
      .from("booking_reviews")
      .select("*")
      .eq("booking_id", bookingId)
      .eq("author_id", targetId)
      .eq("target_id", userId)
      .single();

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
      canWriteReview: !hasWrittenReview,
      hasWrittenReview,
      hasReceivedReview,
      isVisible
    };

    if (daysUntilVisible !== undefined) {
      result.daysUntilVisible = daysUntilVisible;
    }

    return result;
  } catch (error) {
    console.error("Error getting booking review status:", error);
    return {
      canWriteReview: false,
      hasWrittenReview: false,
      hasReceivedReview: false,
      isVisible: false
    };
  }
};