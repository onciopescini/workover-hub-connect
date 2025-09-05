import { supabase } from "@/integrations/supabase/client";

/**
 * Secure data access utilities that use RLS-protected functions
 */

export interface PublicProfile {
  id: string;
  first_name: string;
  last_name: string;
  nickname: string | null;
  profile_photo_url: string | null;
  bio: string | null;
  profession: string | null;
  job_title: string | null;
  city: string | null;
  skills: string | null;
  interests: string | null;
  networking_enabled: boolean;
  collaboration_availability: string | null;
  collaboration_description: string | null;
  created_at: string;
}

export interface PublicSpace {
  id: string;
  title: string;
  description: string | null;
  price_per_day: number;
  city: string | null;
  country: string | null;
  space_type: string | null;
  capacity: number | null;
  amenities: string[] | null;
  images: string[] | null;
  rating: number;
  total_reviews: number;
  is_available: boolean;
  created_at: string;
}

export interface SpaceWithHostInfo extends PublicSpace {
  address: string | null;
  host_id: string;
  host_first_name: string;
  host_last_name: string;
  host_profile_photo_url: string | null;
  host_bio: string | null;
}

/**
 * Get public profile data (filtered for privacy)
 */
export const getPublicProfile = async (profileId: string): Promise<PublicProfile | null> => {
  try {
    const { data, error } = await supabase
      .rpc('get_public_profile', { profile_id_param: profileId });

    if (error) {
      console.error('Error fetching public profile:', error);
      return null;
    }

    return data?.[0] || null;
  } catch (error) {
    console.error('Error in getPublicProfile:', error);
    return null;
  }
};

/**
 * Get all public spaces (without host info for privacy)
 */
export const getPublicSpaces = async (): Promise<PublicSpace[]> => {
  try {
    const { data, error } = await supabase
      .rpc('get_public_spaces');

    if (error) {
      console.error('Error fetching public spaces:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in getPublicSpaces:', error);
    return [];
  }
};

/**
 * Get space with host info (requires authentication)
 */
export const getSpaceWithHostInfo = async (spaceId: string): Promise<SpaceWithHostInfo | null> => {
  try {
    const { data, error } = await supabase
      .rpc('get_space_with_host_info', { space_id_param: spaceId });

    if (error) {
      console.error('Error fetching space with host info:', error);
      return null;
    }

    return data?.[0] || null;
  } catch (error) {
    console.error('Error in getSpaceWithHostInfo:', error);
    return null;
  }
};