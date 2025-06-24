
import { supabase } from "@/integrations/supabase/client";

export interface Review {
  id: string;
  booking_id: string;
  rating: number;
  comment: string;
  created_at: string;
  reviewer_id: string;
  reviewee_id: string;
}

export interface ReviewWithDetails {
  id: string;
  booking_id: string;
  rating: number;
  comment: string;
  created_at: string;
  reviewer_id: string;
  reviewee_id: string;
  reviewer?: {
    first_name: string;
    last_name: string;
    profile_photo_url: string | null;
  };
  reviewee?: {
    first_name: string;
    last_name: string;
    profile_photo_url: string | null;
  };
  booking?: {
    space?: {
      title: string;
    };
    booking_date: string;
  };
}

export const getUserReviews = async (userId: string): Promise<{
  given: ReviewWithDetails[];
  received: ReviewWithDetails[];
}> => {
  try {
    const [givenResult, receivedResult] = await Promise.all([
      supabase
        .from('reviews')
        .select(`
          *,
          reviewee:profiles!reviews_reviewee_id_fkey (
            first_name,
            last_name,
            profile_photo_url
          ),
          booking:bookings (
            booking_date,
            space:spaces (
              title
            )
          )
        `)
        .eq('reviewer_id', userId),
      
      supabase
        .from('reviews')
        .select(`
          *,
          reviewer:profiles!reviews_reviewer_id_fkey (
            first_name,
            last_name,
            profile_photo_url
          ),
          booking:bookings (
            booking_date,
            space:spaces (
              title
            )
          )
        `)
        .eq('reviewee_id', userId)
    ]);

    const given = givenResult.data || [];
    const received = receivedResult.data || [];

    return {
      given: given.map(review => ({
        ...review,
        booking: Array.isArray(review.booking) ? review.booking[0] : review.booking
      })),
      received: received.map(review => ({
        ...review,
        booking: Array.isArray(review.booking) ? review.booking[0] : review.booking
      }))
    };
  } catch (error) {
    console.error('Error fetching user reviews:', error);
    return { given: [], received: [] };
  }
};

export const getUserAverageRating = async (userId: string): Promise<number | null> => {
  try {
    const { data, error } = await supabase
      .from('reviews')
      .select('rating')
      .eq('reviewee_id', userId);

    if (error) {
      console.error('Error fetching user average rating:', error);
      return null;
    }

    if (!data || data.length === 0) {
      return null;
    }

    const total = data.reduce((sum, review) => sum + review.rating, 0);
    return total / data.length;
  } catch (error) {
    console.error('Error calculating average rating:', error);
    return null;
  }
};

export const calculateAverageRating = (reviews: Review[]): number => {
  if (!reviews || reviews.length === 0) return 0;
  const total = reviews.reduce((sum, review) => sum + review.rating, 0);
  return total / reviews.length;
};
