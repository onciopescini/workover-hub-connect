
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Review {
  id: string;
  booking_id: string;
  author_id: string;
  target_id: string;
  rating: number;
  content: string | null;
  created_at: string;
  updated_at: string;
  is_visible: boolean;
}

export const calculateAverageRating = (reviews: Review[]): number => {
  if (!reviews || reviews.length === 0) {
    return 0;
  }

  const visibleReviews = reviews.filter(review => review.is_visible);
  if (visibleReviews.length === 0) {
    return 0;
  }

  const totalRating = visibleReviews.reduce((sum, review) => sum + review.rating, 0);
  return Math.round((totalRating / visibleReviews.length) * 10) / 10;
};

export const getReviewsForSpace = async (spaceId: string): Promise<Review[]> => {
  try {
    const { data, error } = await supabase
      .from('booking_reviews')
      .select(`
        *,
        bookings!inner (
          space_id
        )
      `)
      .eq('bookings.space_id', spaceId)
      .eq('is_visible', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching reviews:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Error in getReviewsForSpace:', error);
    return [];
  }
};

export const submitReview = async (
  bookingId: string,
  targetId: string,
  rating: number,
  content: string
): Promise<Review | null> => {
  try {
    const { data, error } = await supabase
      .from('booking_reviews')
      .insert({
        booking_id: bookingId,
        target_id: targetId,
        rating: rating,
        content: content,
        author_id: (await supabase.auth.getUser()).data.user?.id,
      })
      .select()
      .single();

    if (error) {
      console.error('Error submitting review:', error);
      toast.error('Errore nell\'invio della recensione');
      throw error;
    }

    toast.success('Recensione inviata con successo');
    return data;
  } catch (error) {
    console.error('Error in submitReview:', error);
    return null;
  }
};

export const canUserReview = async (bookingId: string, userId: string): Promise<boolean> => {
  try {
    // Check if user has already reviewed this booking
    const { data: existingReview, error } = await supabase
      .from('booking_reviews')
      .select('id')
      .eq('booking_id', bookingId)
      .eq('author_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error checking existing review:', error);
      return false;
    }

    // If review exists, user cannot review again
    return !existingReview;
  } catch (error) {
    console.error('Error in canUserReview:', error);
    return false;
  }
};
