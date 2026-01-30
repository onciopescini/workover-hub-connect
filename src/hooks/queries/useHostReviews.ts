import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { TIME_CONSTANTS } from "@/constants";
import { queryKeys } from "@/lib/react-query-config";

export interface HostReview {
  id: string;
  rating: number;
  content: string | null;
  created_at: string;
  reviewer_first_name: string;
  reviewer_last_name: string;
  reviewer_profile_photo_url: string | null;
  space_title: string;
  space_id: string;
}

/**
 * Fetches reviews for a host aggregated across all their spaces
 * This queries the reviews table joined with spaces to get reviews
 * where the host owns the space being reviewed
 */
const getHostReviews = async (hostId: string): Promise<HostReview[]> => {
  if (!hostId) return [];

  // Query reviews for spaces owned by this host
  // The reviews table uses 'comment' not 'content'
  const { data, error } = await supabase
    .from('reviews')
    .select(`
      id,
      rating,
      comment,
      created_at,
      reviewer_id,
      space_id,
      spaces!inner(
        id,
        title,
        host_id
      )
    `)
    .eq('spaces.host_id', hostId)
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) {
    console.error('Error fetching host reviews:', error);
    // Fallback: try space_reviews table
    const { data: spaceReviews, error: spaceError } = await supabase
      .from('space_reviews')
      .select(`
        id,
        rating,
        content,
        created_at,
        author_id,
        space_id,
        spaces!inner(
          id,
          title,
          host_id
        )
      `)
      .eq('spaces.host_id', hostId)
      .eq('is_visible', true)
      .order('created_at', { ascending: false })
      .limit(10);

    if (spaceError) {
      console.error('Error fetching space reviews:', spaceError);
      return [];
    }

    // Get reviewer profiles
    const reviewerIds = (spaceReviews || []).map(r => r.author_id);
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, profile_photo_url')
      .in('id', reviewerIds);

    const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

    return (spaceReviews || []).map(r => {
      const profile = profileMap.get(r.author_id);
      const spaceData = Array.isArray(r.spaces) ? r.spaces[0] : r.spaces;
      return {
        id: r.id,
        rating: r.rating,
        content: r.content,
        created_at: r.created_at,
        reviewer_first_name: profile?.first_name || 'Utente',
        reviewer_last_name: profile?.last_name || '',
        reviewer_profile_photo_url: profile?.profile_photo_url || null,
        space_title: spaceData?.title || 'Spazio',
        space_id: r.space_id,
      };
    });
  }

  // Get reviewer profiles for the reviews
  const reviewerIds = (data || []).map(r => r.reviewer_id);
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, first_name, last_name, profile_photo_url')
    .in('id', reviewerIds);

  const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

  return (data || [])
    .filter(r => r.space_id !== null)
    .map(r => {
      const profile = profileMap.get(r.reviewer_id);
      const spaceData = Array.isArray(r.spaces) ? r.spaces[0] : r.spaces;
      return {
        id: r.id,
        rating: r.rating,
        content: r.comment, // Map 'comment' to 'content' for UI consistency
        created_at: r.created_at,
        reviewer_first_name: profile?.first_name || 'Utente',
        reviewer_last_name: profile?.last_name || '',
        reviewer_profile_photo_url: profile?.profile_photo_url || null,
        space_title: spaceData?.title || 'Spazio',
        space_id: r.space_id!,
      };
    });
};

export const useHostReviews = (hostId: string | undefined) => {
  return useQuery({
    queryKey: ['host-reviews', hostId],
    queryFn: () => getHostReviews(hostId!),
    enabled: !!hostId,
    staleTime: TIME_CONSTANTS.CACHE_DURATION,
  });
};
