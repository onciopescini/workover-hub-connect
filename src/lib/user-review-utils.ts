import { supabase } from "@/integrations/supabase/client";
import { sreLogger } from '@/lib/sre-logger';

export interface UserPublicReview {
  id: string;
  rating: number;
  content: string | null;
  created_at: string;
  author_first_name: string;
  author_last_name: string;
  author_profile_photo_url: string | null;
  booking_date: string;
  is_visible: boolean;
  author_id: string;
}

/**
 * Fetches sanitized public reviews for a user directly from the table
 * Replaces the RPC call to ensure reliability
 */
export const getUserPublicReviews = async (userId: string): Promise<UserPublicReview[]> => {
  try {
    const { data, error } = await supabase
      .from('booking_reviews')
      .select(`
        id,
        rating,
        content,
        created_at,
        is_visible,
        author_id,
        booking:bookings!booking_reviews_booking_id_fkey (
          booking_date
        ),
        author:profiles!booking_reviews_author_id_fkey (
          first_name,
          last_name,
          profile_photo_url
        )
      `)
      .eq('target_id', userId)
      .eq('is_visible', true)
      .order('created_at', { ascending: false });

    if (error) {
      sreLogger.error('Error fetching user public reviews', { error, userId });
      return [];
    }

    if (!data) return [];

    // Transform the data to match the expected interface
    return data.map((review: any) => ({
      id: review.id,
      rating: review.rating,
      content: review.content,
      created_at: review.created_at,
      is_visible: review.is_visible,
      author_id: review.author_id,
      author_first_name: review.author?.first_name || 'Utente',
      author_last_name: review.author?.last_name || '',
      author_profile_photo_url: review.author?.profile_photo_url,
      booking_date: review.booking?.booking_date || new Date().toISOString()
    }));
  } catch (error) {
    sreLogger.error('Error in getUserPublicReviews', { error, userId });
    return [];
  }
};
