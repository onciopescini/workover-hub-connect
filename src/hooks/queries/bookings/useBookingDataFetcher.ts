
import { supabase } from "@/integrations/supabase/client";
import { BookingFilter } from "./useBookingFilters";

// Fetch bookings where user is the coworker (guest)
export const fetchCoworkerBookings = async (userId: string, filters?: BookingFilter) => {
  console.log('🔍 Fetching coworker bookings for user:', userId);

  let query = supabase
    .from("bookings")
    .select(`
      *,
      spaces!inner (
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
    .eq("user_id", userId)
    .order("booking_date", { ascending: false });

  // Apply filters
  if (filters?.status) {
    query = query.eq("status", filters.status);
  }
  if (filters?.dateRange) {
    query = query
      .gte("booking_date", filters.dateRange.start)
      .lte("booking_date", filters.dateRange.end);
  }
  if (filters?.spaceId) {
    query = query.eq("space_id", filters.spaceId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('❌ Coworker bookings error:', error);
    throw error;
  }

  return data || [];
};

// Fetch bookings where user is the host
export const fetchHostBookings = async (userId: string, userRole?: string, filters?: BookingFilter) => {
  console.log('🔍 Fetching host bookings for user:', userId);

  if (userRole !== "host" && userRole !== "admin") {
    return [];
  }

  // First get user's spaces
  const { data: userSpaces, error: spacesError } = await supabase
    .from("spaces")
    .select("id")
    .eq("host_id", userId);

  if (spacesError) {
    console.error('❌ User spaces error:', spacesError);
    return [];
  }

  if (!userSpaces || userSpaces.length === 0) {
    return [];
  }

  const spaceIds = userSpaces.map(space => space.id);

  let query = supabase
    .from("bookings")
    .select(`
      *,
      spaces!inner (
        id,
        title,
        address,
        photos,
        host_id,
        price_per_day,
        confirmation_type
      ),
      profiles!bookings_user_id_fkey (
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
    .in("space_id", spaceIds)
    .neq("user_id", userId) // Don't include own bookings
    .order("booking_date", { ascending: false });

  // Apply filters
  if (filters?.status) {
    query = query.eq("status", filters.status);
  }
  if (filters?.dateRange) {
    query = query
      .gte("booking_date", filters.dateRange.start)
      .lte("booking_date", filters.dateRange.end);
  }
  if (filters?.spaceId) {
    query = query.eq("space_id", filters.spaceId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('❌ Host bookings error:', error);
    return [];
  }

  return data || [];
};
