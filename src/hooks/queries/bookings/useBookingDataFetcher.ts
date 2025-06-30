
import { supabase } from "@/integrations/supabase/client";
import { BookingFilter } from "./useBookingFilters";

export const fetchCoworkerBookings = async (userId: string, filters?: BookingFilter) => {
  console.log('🔍 Fetching coworker bookings for user:', userId);
  
  try {
    let query = supabase
      .from('bookings')
      .select(`
        *,
        space:spaces (
          id,
          title,
          address,
          photos,
          host_id,
          price_per_day,
          confirmation_type
        ),
        payments (
          id,
          payment_status,
          amount,
          created_at
        )
      `)
      .eq('user_id', userId);

    // Apply filters with validation
    if (filters?.status && ['pending', 'confirmed', 'cancelled'].includes(filters.status)) {
      query = query.eq('status', filters.status);
    }

    if (filters?.dateRange?.start && filters?.dateRange?.end) {
      query = query
        .gte('booking_date', filters.dateRange.start)
        .lte('booking_date', filters.dateRange.end);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Error fetching coworker bookings:', error);
      throw new Error(`Failed to fetch coworker bookings: ${error.message}`);
    }

    console.log('✅ Coworker bookings fetched:', data?.length || 0);
    return data || [];

  } catch (error) {
    console.error('❌ Exception in fetchCoworkerBookings:', error);
    throw error;
  }
};

export const fetchHostBookings = async (userId: string, userRole: string, filters?: BookingFilter) => {
  console.log('🔍 Fetching host bookings for user:', userId, 'role:', userRole);
  
  try {
    // First, get user's spaces with error handling
    const { data: userSpaces, error: spacesError } = await supabase
      .from('spaces')
      .select('id, title')
      .eq('host_id', userId);

    if (spacesError) {
      console.error('❌ Error fetching user spaces:', spacesError);
      throw new Error(`Failed to fetch user spaces: ${spacesError.message}`);
    }

    if (!userSpaces || userSpaces.length === 0) {
      console.log('📝 No spaces found for host');
      return [];
    }

    const spaceIds = userSpaces.map(space => space.id);
    console.log('📊 Found spaces:', spaceIds.length);

    // Fetch bookings with simplified query structure
    let query = supabase
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
        payments (
          id,
          payment_status,
          amount,
          created_at
        )
      `)
      .in('space_id', spaceIds);

    // Apply filters with validation
    if (filters?.status && ['pending', 'confirmed', 'cancelled'].includes(filters.status)) {
      query = query.eq('status', filters.status);
    }

    if (filters?.dateRange?.start && filters?.dateRange?.end) {
      query = query
        .gte('booking_date', filters.dateRange.start)
        .lte('booking_date', filters.dateRange.end);
    }

    const { data: bookings, error: bookingsError } = await query.order('created_at', { ascending: false });

    if (bookingsError) {
      console.error('❌ Error fetching host bookings:', bookingsError);
      throw new Error(`Failed to fetch host bookings: ${bookingsError.message}`);
    }

    // Fetch coworker profiles separately to avoid foreign key issues
    const userIds = [...new Set(bookings?.map(b => b.user_id) || [])];
    const { data: coworkerProfiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, profile_photo_url')
      .in('id', userIds);

    if (profilesError) {
      console.warn('⚠️ Warning fetching coworker profiles:', profilesError);
    }

    // Manually join the coworker data to avoid foreign key issues
    const enrichedBookings = (bookings || []).map(booking => ({
      ...booking,
      coworker: coworkerProfiles?.find(profile => profile.id === booking.user_id) || null
    }));

    console.log('✅ Host bookings fetched and enriched:', enrichedBookings.length);
    return enrichedBookings;

  } catch (error) {
    console.error('❌ Exception in fetchHostBookings:', error);
    throw error;
  }
};
