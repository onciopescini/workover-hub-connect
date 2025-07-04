
import { supabase } from "@/integrations/supabase/client";

export interface Review {
  id: string;
  booking_id: string;
  rating: number;
  comment: string;
  created_at: string;
  reviewer_id: string;
  reviewee_id: string;
  // Properties for SpaceReviews compatibility
  author_id?: string;
  content?: string;
  is_visible?: boolean;
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
  } | null;
  reviewee?: {
    first_name: string;
    last_name: string;
    profile_photo_url: string | null;
  } | null;
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
    // Get reviews given by user - fetch profiles separately
    const [givenResult, receivedResult] = await Promise.all([
      supabase
        .from('reviews')
        .select(`
          *,
          booking:bookings!reviews_booking_id_fkey (
            booking_date,
            space:spaces!bookings_space_id_fkey (
              title
            )
          )
        `)
        .eq('reviewer_id', userId),
      
      supabase
        .from('reviews')
        .select(`
          *,
          booking:bookings!reviews_booking_id_fkey (
            booking_date,
            space:spaces!bookings_space_id_fkey (
              title
            )
          )
        `)
        .eq('reviewee_id', userId)
    ]);

    // Get profile data separately for reviewees and reviewers
    const givenRevieweeIds = (givenResult.data || []).map(r => r.reviewee_id);
    const receivedReviewerIds = (receivedResult.data || []).map(r => r.reviewer_id);
    
    const [revieweeProfiles, reviewerProfiles] = await Promise.all([
      givenRevieweeIds.length > 0 ? supabase
        .from('profiles')
        .select('id, first_name, last_name, profile_photo_url')
        .in('id', givenRevieweeIds) : Promise.resolve({ data: [] }),
      
      receivedReviewerIds.length > 0 ? supabase
        .from('profiles')
        .select('id, first_name, last_name, profile_photo_url')
        .in('id', receivedReviewerIds) : Promise.resolve({ data: [] })
    ]);

    const revieweeProfilesMap = new Map((revieweeProfiles.data || []).map(p => [p.id, p]));
    const reviewerProfilesMap = new Map((reviewerProfiles.data || []).map(p => [p.id, p]));

    const given = (givenResult.data || []).map(review => ({
      ...review,
      comment: review.comment ?? '',
      created_at: review.created_at ?? '',
      reviewee: revieweeProfilesMap.get(review.reviewee_id) || null,
      booking: Array.isArray(review.booking) ? review.booking[0] : review.booking
    }));

    const received = (receivedResult.data || []).map(review => ({
      ...review,
      comment: review.comment ?? '',
      created_at: review.created_at ?? '',
      reviewer: reviewerProfilesMap.get(review.reviewer_id) || null,
      booking: Array.isArray(review.booking) ? review.booking[0] : review.booking
    }));

    return { given, received };
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
