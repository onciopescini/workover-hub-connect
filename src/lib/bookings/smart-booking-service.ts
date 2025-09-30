import { supabase } from "@/integrations/supabase/client";
import { BookingWithDetails } from '@/types/booking';
import { sreLogger } from '@/lib/sre-logger';

export interface BookingRecommendation {
  action: 'auto-approve' | 'approve' | 'review' | 'reject';
  confidence: number;
  score: number;
  reasons: string[];
  riskFactors: string[];
}

export interface GuestProfile {
  totalBookings: number;
  completedBookings: number;
  cancelledBookings: number;
  averageRating: number;
  reviewCount: number;
  accountAge: number; // days
  lastBookingDate: string | null;
  isRepeatGuest: boolean;
  spaceCompatibility: number;
}

export const analyzeGuestProfile = async (userId: string, spaceId: string): Promise<GuestProfile> => {
  try {
    // Get user's booking history
    const { data: bookings, error: bookingsError } = await supabase
      .from('bookings')
      .select(`
        *,
        booking_reviews (
          rating
        )
      `)
      .eq('user_id', userId);

    if (bookingsError) throw bookingsError;

    // Get user profile info
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('created_at')
      .eq('id', userId)
      .single();

    if (profileError) throw profileError;

    // Get reviews for this user
    const { data: reviews, error: reviewsError } = await supabase
      .from('booking_reviews')
      .select('rating')
      .eq('target_id', userId);

    if (reviewsError) throw reviewsError;

    // Calculate metrics
    const totalBookings = bookings?.length || 0;
    const completedBookings = bookings?.filter(b => b.status === 'confirmed').length || 0;
    const cancelledBookings = bookings?.filter(b => b.status === 'cancelled').length || 0;

    // Calculate average rating
    const ratings = reviews?.map(r => r.rating) || [];
    const averageRating = ratings.length > 0 
      ? ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length 
      : 0;

    // Calculate account age
    const accountCreated = profile?.created_at ? new Date(profile.created_at) : new Date();
    const accountAge = Math.floor((Date.now() - accountCreated.getTime()) / (1000 * 60 * 60 * 24));

    // Check if repeat guest for this space
    const spaceBookings = bookings?.filter(b => 
      b.space_id === spaceId && b.status === 'confirmed'
    ) || [];
    const isRepeatGuest = spaceBookings.length > 0;

    // Get last booking date
    const lastBooking = bookings
      ?.filter(b => b.status === 'confirmed' && b.created_at)
      ?.sort((a, b) => new Date(b.created_at!).getTime() - new Date(a.created_at!).getTime())[0];

    const lastBookingDate = lastBooking?.created_at || null;

    // Calculate space compatibility (mock - in real app, this would use ML)
    const spaceCompatibility = Math.min(100, 
      (completedBookings * 10) + 
      (averageRating * 15) + 
      (accountAge > 30 ? 20 : 0) +
      (isRepeatGuest ? 25 : 0) +
      (totalBookings > 5 ? 15 : 0)
    );

    return {
      totalBookings,
      completedBookings,
      cancelledBookings,
      averageRating,
      reviewCount: ratings.length,
      accountAge,
      lastBookingDate,
      isRepeatGuest,
      spaceCompatibility
    };

  } catch (error) {
    sreLogger.error('Error analyzing guest profile', { 
      context: 'analyzeGuestProfile',
      userId,
      spaceId 
    }, error as Error);
    return {
      totalBookings: 0,
      completedBookings: 0,
      cancelledBookings: 0,
      averageRating: 0,
      reviewCount: 0,
      accountAge: 0,
      lastBookingDate: null,
      isRepeatGuest: false,
      spaceCompatibility: 50
    };
  }
};

export const generateBookingRecommendation = (
  guestProfile: GuestProfile,
  booking: BookingWithDetails
): BookingRecommendation => {
  const reasons: string[] = [];
  const riskFactors: string[] = [];
  let score = 50; // Base score

  // Positive factors
  if (guestProfile.isRepeatGuest) {
    score += 25;
    reasons.push('Guest ricorrente per questo spazio');
  }

  if (guestProfile.averageRating >= 4.5) {
    score += 20;
    reasons.push(`Eccellenti recensioni (${guestProfile.averageRating.toFixed(1)}/5)`);
  } else if (guestProfile.averageRating >= 4.0) {
    score += 15;
    reasons.push(`Buone recensioni (${guestProfile.averageRating.toFixed(1)}/5)`);
  }

  if (guestProfile.completedBookings >= 10) {
    score += 15;
    reasons.push(`${guestProfile.completedBookings} prenotazioni completate`);
  } else if (guestProfile.completedBookings >= 5) {
    score += 10;
    reasons.push(`${guestProfile.completedBookings} prenotazioni completate`);
  }

  if (guestProfile.accountAge >= 90) {
    score += 10;
    reasons.push('Account maturo (90+ giorni)');
  }

  // Risk factors
  if (guestProfile.cancelledBookings > 0) {
    const cancelRate = (guestProfile.cancelledBookings / guestProfile.totalBookings) * 100;
    if (cancelRate > 20) {
      score -= 20;
      riskFactors.push(`Alto tasso di cancellazione (${cancelRate.toFixed(1)}%)`);
    } else if (cancelRate > 10) {
      score -= 10;
      riskFactors.push(`Tasso di cancellazione moderato (${cancelRate.toFixed(1)}%)`);
    }
  }

  if (guestProfile.averageRating < 3.5 && guestProfile.reviewCount > 0) {
    score -= 15;
    riskFactors.push(`Recensioni sotto la media (${guestProfile.averageRating.toFixed(1)}/5)`);
  }

  if (guestProfile.totalBookings === 0) {
    score -= 10;
    riskFactors.push('Nuovo utente senza storico');
  }

  if (guestProfile.accountAge < 7) {
    score -= 15;
    riskFactors.push('Account molto recente');
  }

  // Determine action based on score
  let action: BookingRecommendation['action'];
  let confidence: number;

  if (score >= 85) {
    action = 'auto-approve';
    confidence = 95;
  } else if (score >= 70) {
    action = 'approve';
    confidence = 85;
  } else if (score >= 50) {
    action = 'review';
    confidence = 70;
  } else {
    action = 'reject';
    confidence = 80;
  }

  return {
    action,
    confidence,
    score: Math.max(0, Math.min(100, score)),
    reasons,
    riskFactors
  };
};