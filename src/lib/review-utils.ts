
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { ReviewWithDetails, ReviewInsert } from "@/types/review";

// Get reviews for a specific user (both given and received)
export const getUserReviews = async (userId: string): Promise<{
  given: ReviewWithDetails[];
  received: ReviewWithDetails[];
}> => {
  try {
    // Reviews given by the user
    const { data: givenReviews, error: givenError } = await supabase
      .from('reviews')
      .select(`
        *,
        reviewee:reviewee_id (
          first_name,
          last_name,
          profile_photo_url
        ),
        booking:booking_id (
          booking_date,
          space:space_id (
            title,
            address
          )
        )
      `)
      .eq('reviewer_id', userId);

    if (givenError) throw givenError;

    // Reviews received by the user
    const { data: receivedReviews, error: receivedError } = await supabase
      .from('reviews')
      .select(`
        *,
        reviewer:reviewer_id (
          first_name,
          last_name,
          profile_photo_url
        ),
        booking:booking_id (
          booking_date,
          space:space_id (
            title,
            address
          )
        )
      `)
      .eq('reviewee_id', userId);

    if (receivedError) throw receivedError;

    return {
      given: givenReviews as ReviewWithDetails[] || [],
      received: receivedReviews as ReviewWithDetails[] || []
    };
  } catch (error) {
    console.error("Error fetching user reviews:", error);
    return { given: [], received: [] };
  }
};

// Add a new review
export const addReview = async (review: ReviewInsert): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('reviews')
      .insert(review);

    if (error) {
      toast.error("Failed to submit review");
      console.error(error);
      return false;
    }

    toast.success("Review submitted successfully");
    return true;
  } catch (error) {
    console.error("Error adding review:", error);
    toast.error("Failed to submit review");
    return false;
  }
};

// Get average rating for a user
export const getUserAverageRating = async (userId: string): Promise<number | null> => {
  try {
    const { data, error } = await supabase
      .from('reviews')
      .select('rating')
      .eq('reviewee_id', userId);

    if (error) throw error;

    if (!data || data.length === 0) return null;

    const average = data.reduce((sum, review) => sum + review.rating, 0) / data.length;
    return Math.round(average * 10) / 10; // Round to 1 decimal place
  } catch (error) {
    console.error("Error calculating average rating:", error);
    return null;
  }
};
