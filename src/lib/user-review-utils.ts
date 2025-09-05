import { supabase } from "@/integrations/supabase/client";

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
}

/**
 * Fetches sanitized public reviews for a user without exposing internal IDs
 */
export const getUserPublicReviews = async (userId: string): Promise<UserPublicReview[]> => {
  try {
    const { data, error } = await supabase
      .rpc('get_user_public_reviews', { target_id_param: userId });

    if (error) {
      console.error('Error fetching user public reviews:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in getUserPublicReviews:', error);
    return [];
  }
};