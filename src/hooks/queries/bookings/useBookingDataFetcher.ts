
import { supabase } from "@/integrations/supabase/client";
import { BookingFilter } from "./useBookingFilters";

export const fetchCoworkerBookings = async (userId: string, filters?: BookingFilter) => {
  console.log('🔍 Fetching coworker bookings for user:', userId);
  
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
    .eq('user_id', userId);

  // Apply filters
  if (filters?.status) {
    query = query.eq('status', filters.status);
  }

  if (filters?.dateRange) {
    query = query
      .gte('booking_date', filters.dateRange.start)
      .lte('booking_date', filters.dateRange.end);
  }

  const { data, error } = await query.order('created_at', { ascending: false });

  if (error) {
    console.error('❌ Error fetching coworker bookings:', error);
    throw error;
  }

  console.log('✅ Coworker bookings fetched:', data?.length || 0);
  return data || [];
};

export const fetchHostBookings = async (userId: string, userRole: string, filters?: BookingFilter) => {
  console.log('🔍 Fetching host bookings for user:', userId, 'role:', userRole);
  
  // First get user's spaces
  const { data: userSpaces, error: spacesError } = await supabase
    .from('spaces')
    .select('id')
    .eq('host_id', userId);

  if (spacesError) {
    console.error('❌ Error fetching user spaces:', spacesError);
    throw spacesError;
  }

  if (!userSpaces || userSpaces.length === 0) {
    console.log('📝 No spaces found for host');
    return [];
  }

  const spaceIds = userSpaces.map(space => space.id);

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
    .in('space_id', spaceIds);

  // Apply filters
  if (filters?.status) {
    query = query.eq('status', filters.status);
  }

  if (filters?.dateRange) {
    query = query
      .gte('booking_date', filters.dateRange.start)
      .lte('booking_date', filters.dateRange.end);
  }

  const { data, error } = await query.order('created_at', { ascending: false });

  if (error) {
    console.error('❌ Error fetching host bookings:', error);
    throw error;
  }

  console.log('✅ Host bookings fetched:', data?.length || 0);
  return data || [];
};
