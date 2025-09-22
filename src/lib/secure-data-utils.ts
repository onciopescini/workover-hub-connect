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
  category: string;
  subcategory: string | null;
  photos: string[];
  price_per_day: number;
  address: string;
  latitude: number | null;
  longitude: number | null;
  max_capacity: number;
  workspace_features: string[];
  amenities: string[];
  work_environment: string;
  seating_type: string;
  ideal_guest: string;
  confirmation_type: string;
  published: boolean;
  created_at: string;
  host_first_name: string;
  host_last_name: string;
  host_profile_photo: string | null;
}

export interface SpaceWithHostInfo {
  id: string;
  title: string;
  description: string | null;
  category: string;
  subcategory: string | null;
  photos: string[];
  price_per_day: number;
  address: string;
  latitude: number | null;
  longitude: number | null;
  max_capacity: number;
  workspace_features: string[];
  amenities: string[];
  work_environment: string;
  seating_type: string;
  ideal_guest: string;
  confirmation_type: string;
  published: boolean;
  created_at: string;
  availability: any;
  host_first_name: string;
  host_last_name: string;
  host_profile_photo: string | null;
  host_bio: string | null;
  host_networking_enabled: boolean;
}

/**
 * Get public profile data (filtered for privacy) - Using secure function
 */
export const getPublicProfile = async (profileId: string): Promise<PublicProfile | null> => {
  try {
    const { data, error } = await supabase
      .rpc('get_safe_public_profile', { profile_id_param: profileId });

    if (error) {
      console.error('Error fetching public profile:', error);
      return null;
    }

    // Handle the JSON response from the secure function
    if (data && typeof data === 'object' && !Array.isArray(data) && !(data as any).error) {
      return data as unknown as PublicProfile;
    }

    return null;
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
      .rpc('get_public_spaces_safe');

    if (error) {
      console.error('Error fetching public spaces:', error);
      return [];
    }

    // Handle JSON response from safe function
    if (Array.isArray(data)) {
      return data as any[];
    }
    
    return [];
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

    if (!data || (Array.isArray(data) && data.length === 0)) {
      return null;
    }

    // Handle both array and single object responses
    const spaceData = Array.isArray(data) ? data[0] : data;
    return spaceData as SpaceWithHostInfo;
  } catch (error) {
    console.error('Error in getSpaceWithHostInfo:', error);
    return null;
  }
};