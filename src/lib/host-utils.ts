
import { supabase } from "@/integrations/supabase/client";

export const getHostSpaces = async (hostId: string) => {
  console.log('🔍 getHostSpaces: Fetching ALL spaces for host:', hostId);
  
  try {
    const { data, error } = await supabase
      .from('spaces')
      .select('*')
      .eq('host_id', hostId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Error fetching host spaces:', error);
      throw error;
    }

    console.log('✅ getHostSpaces: Found', data?.length || 0, 'spaces for host');
    console.log('📊 Spaces data:', data?.map(space => ({
      id: space.id,
      title: space.title,
      published: space.published,
      is_suspended: space.is_suspended,
      host_id: space.host_id
    })));
    
    return data || [];
  } catch (error) {
    console.error('❌ getHostSpaces: Exception:', error);
    throw error;
  }
};

export const getHostBookings = async (hostId: string) => {
  console.log('🔍 getHostBookings: Fetching bookings for host:', hostId);
  
  try {
    // First get host's spaces
    const { data: spaces, error: spacesError } = await supabase
      .from('spaces')
      .select('id')
      .eq('host_id', hostId);

    if (spacesError) {
      console.error('❌ Error fetching host spaces:', spacesError);
      throw spacesError;
    }

    if (!spaces || spaces.length === 0) {
      console.log('📝 No spaces found for host');
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
      console.error('❌ Error fetching host bookings:', bookingsError);
      throw bookingsError;
    }

    console.log('✅ getHostBookings: Found', bookings?.length || 0, 'bookings');
    return bookings || [];
  } catch (error) {
    console.error('❌ getHostBookings: Exception:', error);
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
