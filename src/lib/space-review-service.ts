import { supabase } from "@/integrations/supabase/client";
import { sreLogger } from '@/lib/sre-logger';
import { toast } from "sonner";
import type { SpaceReviewWithDetails, SpaceReviewStatus, SpaceReviewsStats, SpaceReviewInsert } from '@/types/space-review';
import { isBefore, parseISO } from "date-fns";

/**
 * Fetches reviews for a specific space from the unified 'reviews' table
 */
export const getSpaceReviews = async (spaceId: string): Promise<SpaceReviewWithDetails[]> => {
  try {
    // Query the new 'reviews' table and join with profiles for reviewer details
    // and bookings for the booking date
    const { data, error } = await supabase
      .from('reviews')
      .select(`
        id,
        booking_id,
        space_id,
        reviewer_id,
        rating,
        comment,
        created_at,
        reviewer:reviewer_id (
          first_name,
          last_name,
          profile_photo_url
        ),
        booking:booking_id (
          booking_date
        )
      `)
      .eq('space_id', spaceId)
      .order('created_at', { ascending: false });

    if (error) {
      sreLogger.error('Error fetching space reviews', { error, spaceId });
      return [];
    }

    // Map the result to SpaceReviewWithDetails interface
    return (data || []).map((review: any) => ({
      id: review.id,
      booking_id: review.booking_id,
      space_id: review.space_id,
      author_id: review.reviewer_id,
      user_id: review.reviewer_id, // Populate alias
      rating: review.rating,
      content: review.comment,
      is_visible: true, // Post-moderation: all reviews are visible by default
      created_at: review.created_at,
      updated_at: review.created_at, // Fallback
      author_first_name: review.reviewer?.first_name || 'Utente',
      author_last_name: review.reviewer?.last_name || '',
      author_profile_photo_url: review.reviewer?.profile_photo_url || null,
      booking_date: review.booking?.booking_date || review.created_at,
    }));
  } catch (error) {
    sreLogger.error('Error in getSpaceReviews', { error, spaceId });
    return [];
  }
};

/**
 * Calculates weighted average rating for a space
 * @deprecated This function is deprecated. Use the cached_avg_rating field on the workspace object instead.
 */
export const getSpaceWeightedRating = async (spaceId: string): Promise<number> => {
  // Return 0 or fetch from workspace if really needed, but mostly relying on cache
  return 0;
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
      .from('reviews')
      .select('id, created_at')
      .eq('booking_id', bookingId)
      .eq('reviewer_id', userId)
      .maybeSingle();

    if (error) {
      sreLogger.error('Error fetching space review status', { error, bookingId, userId });
      return {
        canWriteReview: false,
        hasWrittenReview: false,
        isVisible: false,
        daysUntilVisible: 0
      };
    }

    const hasWrittenReview = !!data;

    return {
      canWriteReview: !hasWrittenReview, // logic for eligibility is checked before calling this or in UI
      hasWrittenReview,
      isVisible: true,
      daysUntilVisible: 0
    };
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
    // 1. Validate Booking Status (Backend Security Check)
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('status, user_id, booking_date, end_time, service_completed_at')
      .eq('id', review.booking_id)
      .maybeSingle();

    if (bookingError || !booking) {
      sreLogger.error('Error fetching booking for review validation', { error: bookingError, bookingId: review.booking_id });
      toast.error("Prenotazione non trovata.");
      return false;
    }

    // Verify ownership
    if (booking.user_id !== review.author_id) {
       sreLogger.warn('Review author mismatch', { bookingUser: booking.user_id, reviewAuthor: review.author_id });
       toast.error("Non autorizzato.");
       return false;
    }

    // RELAXED CHECK: served OR (confirmed|checked_in AND ended)
    let isEligible = false;
    if (booking.status === 'served') {
      isEligible = true;
    } else if (['confirmed', 'checked_in'].includes(booking.status || '')) {
      // Check if ended
      if (booking.service_completed_at) {
        isEligible = true;
      } else if (booking.booking_date && booking.end_time) {
        const endDateTimeStr = `${booking.booking_date}T${booking.end_time}`;
        const endDateTime = parseISO(endDateTimeStr);
        if (isBefore(endDateTime, new Date())) {
          isEligible = true;
        }
      }
    }

    if (!isEligible) {
      sreLogger.warn('Attempt to review ineligible booking', { bookingId: review.booking_id, status: booking.status });
      toast.error("Non puoi ancora recensire questa prenotazione.");
      return false;
    }

    // 2. Rate limiting check (using the new table)
    const canCreate = await checkSpaceReviewRateLimit(review.author_id);
    if (!canCreate) {
      toast.error("Troppo veloce! Aspetta un momento prima di recensire di nuovo.");
      return false;
    }

    // 3. Check for duplicate (using the new table)
    const { data: existing } = await supabase
      .from('reviews')
      .select('id')
      .eq('booking_id', review.booking_id)
      .eq('reviewer_id', review.author_id)
      .maybeSingle();

    if (existing) {
      toast.error("Hai già recensito questa prenotazione.");
      return false;
    }

    // 4. Insert review into 'reviews' table
    // Mapping SpaceReviewInsert fields to 'reviews' columns
    const { error } = await supabase
      .from('reviews')
      .insert({
        booking_id: review.booking_id,
        space_id: review.space_id,
        reviewer_id: review.author_id,
        rating: review.rating,
        comment: review.content || null,
        // receiver_id is optional, typically used for User reviews (Host/Guest).
        // For space reviews, space_id is sufficient.
      });

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
      .from('reviews')
      .select('id')
      .eq('reviewer_id', userId)
      .gte('created_at', fiveMinutesAgo);

    if (error) {
      sreLogger.error('Error checking rate limit', { error, userId });
      return true; // fail open or closed? assuming open to avoid blocking valid users on error, but logging it
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
