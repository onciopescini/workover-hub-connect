import { supabase } from "@/integrations/supabase/client";
import { sreLogger } from '@/lib/sre-logger';

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
  name?: string;
  description: string | null;
  category: string;
  subcategory: string | null;
  photos: string[];
  price_per_day: number;
  price_per_hour?: number;
  address: string;
  latitude: number | null;
  longitude: number | null;
  max_capacity: number;
  workspace_features: string[];
  amenities: string[];
  work_environment?: string;
  seating_type?: string;
  ideal_guest?: string;
  confirmation_type: string;
  published?: boolean;
  created_at: string;
  availability?: any;
  host_first_name?: string;
  host_last_name?: string;
  host_profile_photo?: string | null;
  host_bio?: string | null;
  host_networking_enabled?: boolean;
  host_stripe_account_id?: string;
}

/**
 * Get public profile data (filtered for privacy) - Using secure function
 */
export const getPublicProfile = async (profileId: string): Promise<PublicProfile | null> => {
  try {
    const { data, error } = await supabase
      .rpc('get_safe_public_profile', { profile_id_param: profileId });

    if (error) {
      sreLogger.error('Error fetching public profile', { error, profileId });
      return null;
    }

    // Handle the JSON response from the secure function
    if (data && typeof data === 'object' && !Array.isArray(data) && !(data as any).error) {
      return data as unknown as PublicProfile;
    }

    return null;
  } catch (error) {
    sreLogger.error('Error in getPublicProfile', { error, profileId });
    return null;
  }
};

/**
 * Get all public spaces (robust fallback strategy)
 */
export const getPublicSpaces = async (): Promise<any[]> => {
  try {
    // 1) Prova nuovo RPC "safe"
    let { data, error } = await supabase.rpc('get_public_spaces_safe');

    if (error) {
      sreLogger.error('RPC get_public_spaces_safe failed', { 
        error, 
        message: error.message,
        details: (error as any)?.details,
        hint: (error as any)?.hint,
        code: (error as any)?.code
      });

      // 2) Fallback: RPC storico (se esiste nel tuo DB)
      const alt = await supabase.rpc('get_public_spaces');
      if (!alt.error && Array.isArray(alt.data)) {
        return alt.data as any[];
      }

      // 3) Fallback finale: query diretta tabella/view pubblica
      const direct = await supabase
        .from('spaces') // oppure la tua view "spaces_public_view"
        .select('id,title,price_per_day,category,work_environment,max_capacity,address,created_at,photos,description,subcategory,latitude,longitude,workspace_features,amenities,seating_type,ideal_guest,confirmation_type,published')
        .eq('published', true)
        .order('created_at', { ascending: false })
        .limit(200);

      if (direct.error) {
        sreLogger.error('Direct spaces query fallback failed', { 
          error: direct.error,
          message: direct.error.message,
          details: (direct.error as any)?.details
        });
        return [];
      }
      return direct.data ?? [];
    }

    return Array.isArray(data) ? (data as any[]) : [];
  } catch (err: any) {
    sreLogger.error('Error in getPublicSpaces', { 
      error: err,
      message: err?.message ?? String(err)
    });
    return [];
  }
};

/**
 * Normalize raw space data to SpaceWithHostInfo format
 */
function normalizeSpaceData(raw: any): SpaceWithHostInfo {
  return {
    id: raw.id,
    title: raw.title ?? raw.name ?? 'Spazio',
    name: raw.name ?? raw.title ?? 'Spazio',
    description: raw.description ?? null,
    category: raw.category ?? '',
    subcategory: raw.subcategory ?? null,
    photos: Array.isArray(raw.photos) ? raw.photos : [],
    price_per_day: Number(raw.price_per_day ?? 0),
    price_per_hour: Number(raw.price_per_hour ?? 0),
    address: raw.address ?? '',
    latitude: typeof raw.latitude === 'number' ? raw.latitude : null,
    longitude: typeof raw.longitude === 'number' ? raw.longitude : null,
    max_capacity: raw.max_capacity ?? 1,
    workspace_features: Array.isArray(raw.workspace_features) ? raw.workspace_features : [],
    amenities: Array.isArray(raw.amenities) ? raw.amenities : [],
    work_environment: raw.work_environment ?? '',
    seating_type: raw.seating_type ?? '',
    ideal_guest: raw.ideal_guest ?? '',
    confirmation_type: raw.confirmation_type ?? 'request',
    published: raw.published ?? true,
    created_at: raw.created_at ?? new Date().toISOString(),
    availability: raw.availability ?? null,
    host_first_name: raw.host_first_name ?? null,
    host_last_name: raw.host_last_name ?? null,
    host_profile_photo: raw.host_profile_photo ?? null,
    host_bio: raw.host_bio ?? null,
    host_networking_enabled: raw.host_networking_enabled ?? false,
    host_stripe_account_id: raw.host_stripe_account_id ?? null,
  };
}

/**
 * Get space with host info (requires authentication)
 */
export const getSpaceWithHostInfo = async (spaceId: string): Promise<SpaceWithHostInfo | null> => {
  try {
    // Try RPC first
    const { data, error } = await supabase
      .rpc('get_space_with_host_info', { space_id_param: spaceId });

    if (!error && data) {
      const spaceData = Array.isArray(data) ? data[0] : data;
      return normalizeSpaceData(spaceData);
    }

    sreLogger.warn('RPC error, trying fallback', { error, spaceId });
    
    // Fallback to direct query
    const { data: fallbackData, error: fallbackError } = await supabase
      .from('spaces')
      .select(`
        *,
        profiles!spaces_host_id_fkey (
          first_name,
          last_name,
          profile_photo_url,
          bio,
          networking_enabled,
          stripe_account_id
        )
      `)
      .eq('id', spaceId)
      .single();

    if (fallbackError || !fallbackData) {
      sreLogger.error('Fallback query error', { error: fallbackError, spaceId });
      return null;
    }

    // Transform fallback data to match expected format
    const profile = fallbackData.profiles as any;
    const normalizedData = {
      ...fallbackData,
      host_first_name: profile?.first_name,
      host_last_name: profile?.last_name,
      host_profile_photo: profile?.profile_photo_url,
      host_bio: profile?.bio,
      host_networking_enabled: profile?.networking_enabled,
      host_stripe_account_id: profile?.stripe_account_id,
    };

    return normalizeSpaceData(normalizedData);
  } catch (error) {
    sreLogger.error('Error in getSpaceWithHostInfo', { error, spaceId });
    return null;
  }
};