import { supabase } from "@/integrations/supabase/client";

export interface SpaceReview {
  id: string;
  rating: number;
  content: string | null;
  created_at: string;
  author_id: string;
  author_first_name: string;
  author_last_name: string;
  author_profile_photo_url: string | null;
  booking_date: string;
  is_visible: boolean;
}

export interface SpaceReviewsStats {
  averageRating: number;
  totalReviews: number;
  ratingDistribution: Record<number, number>;
}

/**
 * Fetches reviews for a specific space using the new database function
 */
export const getSpaceReviews = async (spaceId: string): Promise<SpaceReview[]> => {
  try {
    const { data, error } = await supabase
      .rpc('get_space_reviews_with_details', { space_id_param: spaceId });

    if (error) {
      console.error('Error fetching space reviews:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in getSpaceReviews:', error);
    return [];
  }
};

/**
 * Calculates weighted average rating for a space using the new database function
 */
export const getSpaceWeightedRating = async (spaceId: string): Promise<number> => {
  try {
    const { data, error } = await supabase
      .rpc('calculate_weighted_space_rating', { space_id_param: spaceId });

    if (error) {
      console.error('Error fetching weighted rating:', error);
      return 0;
    }

    return Number(data) || 0;
  } catch (error) {
    console.error('Error in getSpaceWeightedRating:', error);
    return 0;
  }
};

/**
 * Calculates review statistics including distribution
 */
export const calculateReviewStats = (reviews: SpaceReview[]): SpaceReviewsStats => {
  if (!reviews.length) {
    return {
      averageRating: 0,
      totalReviews: 0,
      ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
    };
  }

  const distribution = reviews.reduce((acc, review) => {
    acc[review.rating] = (acc[review.rating] || 0) + 1;
    return acc;
  }, {} as Record<number, number>);

  // Fill missing ratings with 0
  for (let i = 1; i <= 5; i++) {
    if (!distribution[i]) distribution[i] = 0;
  }

  const averageRating = reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length;

  return {
    averageRating,
    totalReviews: reviews.length,
    ratingDistribution: distribution
  };
};

/**
 * Formats review author name
 */
export const formatReviewAuthor = (review: SpaceReview): string => {
  return `${review.author_first_name} ${review.author_last_name}`;
};

/**
 * Gets time since review was created
 */
export const getTimeSinceReview = (createdAt: string): string => {
  const now = new Date();
  const reviewDate = new Date(createdAt);
  const diffInDays = Math.floor((now.getTime() - reviewDate.getTime()) / (1000 * 60 * 60 * 24));
  
  if (diffInDays === 0) return 'Oggi';
  if (diffInDays === 1) return 'Ieri';
  if (diffInDays < 7) return `${diffInDays} giorni fa`;
  if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} settimane fa`;
  if (diffInDays < 365) return `${Math.floor(diffInDays / 30)} mesi fa`;
  return `${Math.floor(diffInDays / 365)} anni fa`;
};