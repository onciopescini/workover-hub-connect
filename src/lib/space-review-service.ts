import { supabase } from "@/integrations/supabase/client";
import { sreLogger } from '@/lib/sre-logger';
import { toast } from "sonner";
import type { SpaceReviewWithDetails, SpaceReviewStatus, SpaceReviewsStats, SpaceReviewInsert } from '@/types/space-review';

/**
 * Fetches reviews for a specific space
 */
export const getSpaceReviews = async (spaceId: string): Promise<SpaceReviewWithDetails[]> => {
  try {
    const { data, error } = await supabase
      .rpc('get_space_reviews' as any, { space_id_param: spaceId });

    if (error) {
      sreLogger.error('Error fetching space reviews', { error, spaceId });
      return [];
    }

    return (data || []) as SpaceReviewWithDetails[];
  } catch (error) {
    sreLogger.error('Error in getSpaceReviews', { error, spaceId });
    return [];
  }
};

/**
 * Calculates weighted average rating for a space
 */
export const getSpaceWeightedRating = async (spaceId: string): Promise<number> => {
  try {
    const { data, error } = await supabase
      .rpc('calculate_space_weighted_rating' as any, { space_id_param: spaceId });

    if (error) {
      sreLogger.error('Error fetching weighted rating', { error, spaceId });
      return 0;
    }

    return Number(data) || 0;
  } catch (error) {
    sreLogger.error('Error in getSpaceWeightedRating', { error, spaceId });
    return 0;
  }
};

/**
 * Gets review status for a specific booking
 */
export const getSpaceReviewStatus = async (
  bookingId: string, 
  userId: string
): Promise<SpaceReviewStatus> => {
  try {
    const { data, error } = await supabase
      .rpc('get_space_review_status' as any, {
        booking_id_param: bookingId,
        user_id_param: userId 
      });

    if (error) {
      sreLogger.error('Error fetching space review status', { error, bookingId, userId });
      return {
        canWriteReview: false,
        hasWrittenReview: false,
        isVisible: false,
        daysUntilVisible: 0
      };
    }

    return data as SpaceReviewStatus;
  } catch (error) {
    sreLogger.error('Error in getSpaceReviewStatus', { error, bookingId, userId });
    return {
      canWriteReview: false,
      hasWrittenReview: false,
      isVisible: false,
      daysUntilVisible: 0
    };
  }
};

/**
 * Adds a new space review with validation
 */
export const addSpaceReview = async (review: SpaceReviewInsert): Promise<boolean> => {
  try {
    // Rate limiting check
    const canCreate = await checkSpaceReviewRateLimit(review.author_id);
    if (!canCreate) {
      toast.error("Troppo veloce! Aspetta un momento prima di recensire di nuovo.");
      return false;
    }

    // Check for duplicate
    const { data: existing } = await supabase
      .from('space_reviews' as any)
      .select('id')
      .eq('booking_id', review.booking_id)
      .eq('author_id', review.author_id)
      .maybeSingle();

    if (existing) {
      toast.error("Hai già recensito questo spazio per questa prenotazione.");
      return false;
    }

    // Insert review
    const { error } = await supabase
      .from('space_reviews' as any)
      .insert([review]);

    if (error) {
      sreLogger.error('Error adding space review', { error, review });
      toast.error("Errore durante l'invio della recensione. Riprova.");
      return false;
    }

    toast.success("Recensione inviata con successo!");
    return true;
  } catch (error) {
    sreLogger.error('Error in addSpaceReview', { error, review });
    toast.error("Errore imprevisto. Riprova più tardi.");
    return false;
  }
};

/**
 * Rate limiting check for space reviews
 */
const checkSpaceReviewRateLimit = async (userId: string): Promise<boolean> => {
  try {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

    const { data, error } = await supabase
      .from('space_reviews' as any)
      .select('id')
      .eq('author_id', userId)
      .gte('created_at', fiveMinutesAgo);

    if (error) {
      sreLogger.error('Error checking rate limit', { error, userId });
      return true;
    }

    return !data || data.length < 3;
  } catch (error) {
    sreLogger.error('Error in checkSpaceReviewRateLimit', { error, userId });
    return true;
  }
};

/**
 * Calculates review statistics
 */
export const calculateSpaceReviewStats = (reviews: SpaceReviewWithDetails[]): SpaceReviewsStats => {
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
export const formatSpaceReviewAuthor = (review: SpaceReviewWithDetails): string => {
  return `${review.author_first_name} ${review.author_last_name}`;
};

/**
 * Gets time since review was created
 */
export const getTimeSinceSpaceReview = (createdAt: string): string => {
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
