import { supabase } from "@/integrations/supabase/client";
import { sreLogger } from '@/lib/sre-logger';

/**
 * Secure data access utilities that use RLS-protected functions
 */

/**
 * Campi realmente esposti dalla view spaces_public_safe
 */
const PUBLIC_SPACES_SELECT = [
  'id',
  'title', 
  'description',
  'category',
  'work_environment',
  'max_capacity',
  'confirmation_type',
  'workspace_features',
  'amenities',
  'seating_types',        // ARRAY
  'ideal_guest_tags',     // ARRAY
  'event_friendly_tags',
  'price_per_hour',
  'price_per_day',
  'photos',
  'rules',
  'availability',
  'cancellation_policy',
  'city_name',
  'country_code',
  'approximate_location', // tipo POINT (x=lng, y=lat)
  'published',
  'created_at',
  'updated_at'
].join(', ');

/**
 * Parse Postgres POINT type to lat/lng
 * Supabase returns POINT as string "(x,y)" where x=lng, y=lat
 * or as object {x: lng, y: lat}
 */
function parsePoint(p: unknown): { lat?: number; lng?: number } {
  if (!p) return {};
  
  // String format: "(lng,lat)" o "lng,lat"
  if (typeof p === 'string') {
    const match = p.match(/\(?\s*(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)\s*\)?/);
    if (match && match[1] && match[2]) {
      return { 
        lng: parseFloat(match[1]), 
        lat: parseFloat(match[2]) 
      };
    }
  }
  
  // Object format: {x: lng, y: lat}
  if (typeof p === 'object' && p !== null) {
    const { x, y } = p as any;
    if (typeof x === 'number' && typeof y === 'number') {
      return { lng: x, lat: y };
    }
  }
  
  return {};
}

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
    // Try RPC first (if exists)
    const { data, error } = await supabase
      .rpc('get_safe_public_profile', { profile_id_param: profileId });

    if (!error && data && typeof data === 'object' && !Array.isArray(data) && !(data as any).error) {
      return data as unknown as PublicProfile;
    }

    // Fallback: use profiles_public_safe view
    const { data: viewData, error: viewError } = await supabase
      .from('profiles_public_safe')
      .select(`
        id, first_name, last_name, nickname, profile_photo_url,
        bio, profession, job_title, city, skills, interests,
        networking_enabled, collaboration_availability,
        collaboration_description, created_at
      `)
      .eq('id', profileId)
      .maybeSingle();

    if (viewError) {
      sreLogger.error('Error fetching public profile from view', { error: viewError, profileId });
      return null;
    }

    return viewData as PublicProfile | null;
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
    // 1) Use secure view that doesn't expose host_id or precise location
    let { data, error } = await supabase
      .from('spaces_public_safe')
      .select(PUBLIC_SPACES_SELECT);

    if (!error && Array.isArray(data)) {
      // Normalize data: derive lat/lng, address, and singular fields
      return data.map(normalizePublicSpaceData);
    }

    sreLogger.debug('RPC get_public_spaces_safe failed, using view', { 
      error, 
      message: error?.message
    });

    // 2) Fallback to secure public view (excludes host_id, precise GPS, full address)
    const { data: viewData, error: viewError } = await supabase
      .from('spaces_public_safe')
      .select(PUBLIC_SPACES_SELECT)
      .order('created_at', { ascending: false })
      .limit(200);

    if (viewError) {
      sreLogger.error('spaces_public_safe view query failed', { 
        error: viewError,
        message: viewError.message
      });
      
      // 3) Last resort: try legacy RPC
      const alt = await supabase.rpc('get_public_spaces');
      if (!alt.error && Array.isArray(alt.data)) {
        return alt.data.map(normalizePublicSpaceData);
      }
      
      return [];
    }

    return viewData ? viewData.map(normalizePublicSpaceData) : [];
  } catch (err: any) {
    sreLogger.error('Error in getPublicSpaces', { 
      error: err,
      message: err?.message ?? String(err)
    });
    return [];
  }
};

/**
 * Normalize public space data for UI compatibility
 * Used for spaces_public_safe view results
 */
function normalizePublicSpaceData(raw: any): any {
  const { lat, lng } = parsePoint(raw.approximate_location);
  
  return {
    ...raw,
    // Derived fields for UI compatibility
    latitude: lat ?? null,
    longitude: lng ?? null,
    address: [raw.city_name, raw.country_code].filter(Boolean).join(', ') || '',
    
    // Backward compatibility: singular from array
    seating_type: Array.isArray(raw.seating_types) && raw.seating_types.length > 0 
      ? raw.seating_types[0] 
      : null,
    ideal_guest: Array.isArray(raw.ideal_guest_tags) && raw.ideal_guest_tags.length > 0 
      ? raw.ideal_guest_tags[0] 
      : null,
  };
}

/**
 * Normalize raw space data to SpaceWithHostInfo format
 * Used for getSpaceWithHostInfo (authenticated requests with full data)
 */
function normalizeSpaceData(raw: any): SpaceWithHostInfo {
  const { lat, lng } = parsePoint(raw.approximate_location);
  
  return {
    id: raw.id,
    title: raw.title ?? raw.name ?? 'Spazio',
    name: raw.name ?? raw.title ?? 'Spazio',
    description: raw.description ?? null,
    category: raw.category ?? '',
    photos: Array.isArray(raw.photos) ? raw.photos : [],
    price_per_day: Number(raw.price_per_day ?? 0),
    price_per_hour: Number(raw.price_per_hour ?? 0),
    // Use city-level location (secure) or derive from point
    address: raw.city_name && raw.country_code 
      ? `${raw.city_name}, ${raw.country_code}`
      : raw.address ?? '',
    // Coordinates from approximate_location or fallback
    latitude: lat ?? (typeof raw.latitude === 'number' ? raw.latitude : null),
    longitude: lng ?? (typeof raw.longitude === 'number' ? raw.longitude : null),
    max_capacity: raw.max_capacity ?? 1,
    workspace_features: Array.isArray(raw.workspace_features) ? raw.workspace_features : [],
    amenities: Array.isArray(raw.amenities) ? raw.amenities : [],
    work_environment: raw.work_environment ?? '',
    // Backward compatibility: singular from array or fallback
    seating_type: Array.isArray(raw.seating_types) && raw.seating_types.length > 0
      ? raw.seating_types[0]
      : (raw.seating_type ?? ''),
    ideal_guest: Array.isArray(raw.ideal_guest_tags) && raw.ideal_guest_tags.length > 0
      ? raw.ideal_guest_tags[0]
      : (raw.ideal_guest ?? ''),
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