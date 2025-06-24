
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

export interface ReviewWithDetails {
  id: string;
  booking_id: string;
  author_id: string;
  target_id: string;
  rating: number;
  content: string | null;
  created_at: string;
  updated_at: string;
  is_visible: boolean;
  author?: {
    first_name: string;
    last_name: string;
    profile_photo_url: string | null;
  };
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

export const getUserReviews = async (userId: string): Promise<{ given: ReviewWithDetails[], received: ReviewWithDetails[] }> => {
  try {
    // Get reviews given by user
    const { data: givenReviews, error: givenError } = await supabase
      .from('booking_reviews')
      .select(`
        *,
        target:profiles!booking_reviews_target_id_fkey (
          first_name,
          last_name,
          profile_photo_url
        )
      `)
      .eq('author_id', userId)
      .order('created_at', { ascending: false });

    if (givenError) {
      console.error('Error fetching given reviews:', givenError);
      throw givenError;
    }

    // Get reviews received by user
    const { data: receivedReviews, error: receivedError } = await supabase
      .from('booking_reviews')
      .select(`
        *,
        author:profiles!booking_reviews_author_id_fkey (
          first_name,
          last_name,
          profile_photo_url
        )
      `)
      .eq('target_id', userId)
      .order('created_at', { ascending: false });

    if (receivedError) {
      console.error('Error fetching received reviews:', receivedError);
      throw receivedError;
    }

    return {
      given: givenReviews?.map(review => ({
        ...review,
        author: review.target
      })) || [],
      received: receivedReviews?.map(review => ({
        ...review,
        author: review.author
      })) || []
    };
  } catch (error) {
    console.error('Error in getUserReviews:', error);
    return { given: [], received: [] };
  }
};

export const getUserAverageRating = async (userId: string): Promise<number | null> => {
  try {
    const { data, error } = await supabase
      .from('booking_reviews')
      .select('rating')
      .eq('target_id', userId)
      .eq('is_visible', true);

    if (error) {
      console.error('Error fetching user rating:', error);
      return null;
    }

    if (!data || data.length === 0) {
      return null;
    }

    const totalRating = data.reduce((sum, review) => sum + review.rating, 0);
    return Math.round((totalRating / data.length) * 10) / 10;
  } catch (error) {
    console.error('Error in getUserAverageRating:', error);
    return null;
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

    return !existingReview;
  } catch (error) {
    console.error('Error in canUserReview:', error);
    return false;
  }
};
