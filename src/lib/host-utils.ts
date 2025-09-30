import { supabase } from "@/integrations/supabase/client";
import { sreLogger } from '@/lib/sre-logger';

export const getHostSpaces = async (hostId: string) => {
  sreLogger.debug('getHostSpaces: Fetching ALL spaces for host', { hostId });
  
  try {
    const { data, error } = await supabase
      .from('spaces')
      .select('*')
      .eq('host_id', hostId)
      .order('created_at', { ascending: false });

    if (error) {
      sreLogger.error('Error fetching host spaces', { hostId }, error as Error);
      throw error;
    }

    sreLogger.debug('getHostSpaces: Found spaces', { 
      hostId,
      spacesCount: data?.length || 0,
      spaces: data?.map(space => ({
        id: space.id,
        title: space.title,
        published: space.published,
        is_suspended: space.is_suspended,
        host_id: space.host_id
      }))
    });
    
    return data || [];
  } catch (error) {
    sreLogger.error('getHostSpaces: Exception occurred', { hostId }, error as Error);
    throw error;
  }
};

export const getHostBookings = async (hostId: string) => {
  sreLogger.debug('getHostBookings: Fetching bookings for host', { hostId });
  
  try {
    // First get host's spaces
    const { data: spaces, error: spacesError } = await supabase
      .from('spaces')
      .select('id')
      .eq('host_id', hostId);

    if (spacesError) {
      sreLogger.error('Error fetching host spaces', { hostId }, spacesError as Error);
      throw spacesError;
    }

    if (!spaces || spaces.length === 0) {
      sreLogger.debug('No spaces found for host', { hostId });
      return [];
    }

    const spaceIds = spaces.map(space => space.id);

    // Then get bookings for those spaces
    const { data: bookings, error: bookingsError } = await supabase
      .from('bookings')
      .select(`
        *,
        space:spaces!inner (
          id,
          title,
          address,
          photos,
          host_id,
          price_per_day,
          confirmation_type
        ),
        coworker:profiles!bookings_user_id_fkey (
          id,
          first_name,
          last_name,
          profile_photo_url
        ),
        payments (
          id,
          payment_status,
          amount,
          created_at
        )
      `)
      .in('space_id', spaceIds)
      .order('created_at', { ascending: false });

    if (bookingsError) {
      sreLogger.error('Error fetching host bookings', { hostId, spaceIds }, bookingsError as Error);
      throw bookingsError;
    }

    sreLogger.debug('getHostBookings: Found bookings', { hostId, bookingsCount: bookings?.length || 0 });
    return bookings || [];
  } catch (error) {
    sreLogger.error('getHostBookings: Exception occurred', { hostId }, error as Error);
    throw error;
  }
};

export const getUserRole = (authState: { profile?: { role?: string } } | null): "host" | "coworker" | "admin" | null => {
  if (!authState?.profile?.role) return null;
  const role = authState.profile.role;
  if (role === 'host' || role === 'coworker' || role === 'admin') {
    return role as "host" | "coworker" | "admin";
  }
  return null;
};

export const canAccessHostFeatures = (authState: { profile?: { role?: string } } | null): boolean => {
  const role = getUserRole(authState);
  return role === 'host' || role === 'admin';
};
