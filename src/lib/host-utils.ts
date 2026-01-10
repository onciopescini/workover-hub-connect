import { supabase } from "@/integrations/supabase/client";
import { sreLogger } from '@/lib/sre-logger';

export const getHostSpaces = async (hostId: string) => {
  sreLogger.debug('getHostSpaces: Fetching ALL spaces for host', { hostId });
  
  try {
    const { data, error } = await supabase
      .from('workspaces')
      .select('*, title:name') // Alias name to title for backward compatibility within this function if needed, but best to use updated types
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
        title: space.name,
        published: space.published,
        // is_suspended: space.is_suspended, // Removed as not in workspaces
        host_id: space.host_id
      }))
    });
    
    // Map name back to title for consumers of this utility if they expect 'title' property
    return (data || []).map(s => ({...s, title: s.name}));
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
      .from('workspaces')
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
        space:workspaces!inner (
          id,
          title:name,
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

export const getUserRole = (authState: { roles: string[] } | null): "host" | "coworker" | "admin" | null => {
  if (!authState?.roles || authState.roles.length === 0) return null;
  
  // Priority: admin > host > moderator > user
  if (authState.roles.includes('admin')) return 'admin';
  if (authState.roles.includes('host')) return 'host';
  if (authState.roles.includes('coworker')) return 'coworker';
  if (authState.roles.includes('user')) return 'coworker';
  return 'coworker';
};

export const canAccessHostFeatures = (authState: { roles: string[] } | null): boolean => {
  if (!authState?.roles) return false;
  return authState.roles.includes('host') || authState.roles.includes('admin');
};
