
import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";
import { BookingFilter } from "./useBookingFilters";

export const fetchCoworkerBookings = async (userId: string, filters?: BookingFilter) => {
  logger.debug('Fetching coworker bookings', {
    component: 'booking-data-fetcher',
    action: 'fetch_coworker_bookings',
    userId,
    metadata: { filters }
  });
  
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

    const { data, error: queryError } = await query.order('created_at', { ascending: false });

    if (queryError) {
      logger.error('Error fetching coworker bookings from database', {
        component: 'booking-data-fetcher',
        action: 'fetch_coworker_bookings_db_error',
        userId,
        errorMessage: queryError.message,
        metadata: { filters }
      }, queryError);
      throw new Error(`Failed to fetch coworker bookings: ${queryError.message}`);
    }

    logger.debug('Coworker bookings fetched successfully', {
      component: 'booking-data-fetcher',
      action: 'fetch_coworker_bookings_success',
      count: data?.length || 0,
      userId
    });
    
    return data || [];

  } catch (fetchError) {
    logger.error('Exception in fetchCoworkerBookings', {
      component: 'booking-data-fetcher',
      action: 'fetch_coworker_bookings_exception',
      userId,
      metadata: { filters }
    }, fetchError as Error);
    throw fetchError;
  }
};

export const fetchHostBookings = async (userId: string, userRole: string, filters?: BookingFilter) => {
  logger.debug('Fetching host bookings', {
    component: 'booking-data-fetcher',
    action: 'fetch_host_bookings',
    userId,
    role: userRole,
    metadata: { filters }
  });
  
  try {
    // First, get user's spaces with error handling
    const { data: userSpaces, error: spacesError } = await supabase
      .from('spaces')
      .select('id, title')
      .eq('host_id', userId);

    if (spacesError) {
      logger.error('Error fetching user spaces', {
        component: 'booking-data-fetcher',
        action: 'fetch_user_spaces_error',
        userId,
        role: userRole,
        errorMessage: spacesError.message
      }, spacesError);
      throw new Error(`Failed to fetch user spaces: ${spacesError.message}`);
    }

    if (!userSpaces || userSpaces.length === 0) {
      logger.debug('No spaces found for host', {
        component: 'booking-data-fetcher',
        action: 'fetch_user_spaces_empty',
        userId,
        role: userRole
      });
      return [];
    }

    const spaceIds = userSpaces.map(space => space.id);
    logger.debug('User spaces found', {
      component: 'booking-data-fetcher',
      action: 'fetch_user_spaces_success',
      count: spaceIds.length,
      userId
    });

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
      logger.error('Error fetching host bookings from database', {
        component: 'booking-data-fetcher',
        action: 'fetch_host_bookings_db_error',
        userId,
        role: userRole,
        errorMessage: bookingsError.message,
        metadata: { filters }
      }, bookingsError);
      throw new Error(`Failed to fetch host bookings: ${bookingsError.message}`);
    }

    // Fetch coworker profiles separately to avoid foreign key issues
    const userIds = [...new Set(bookings?.map(b => b.user_id) || [])];
    const { data: coworkerProfiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, profile_photo_url')
      .in('id', userIds);

    if (profilesError) {
      logger.error('Warning fetching coworker profiles', {
        component: 'booking-data-fetcher',
        action: 'fetch_coworker_profiles_warning',
        userId,
        count: userIds.length,
        errorMessage: profilesError.message
      }, profilesError);
    }

    // Manually join the coworker data to avoid foreign key issues
    const enrichedBookings = (bookings || []).map(booking => ({
      ...booking,
      coworker: coworkerProfiles?.find(profile => profile.id === booking.user_id) || null
    }));

    logger.debug('Host bookings fetched and enriched successfully', {
      component: 'booking-data-fetcher',
      action: 'fetch_host_bookings_success',
      count: enrichedBookings.length,
      userId,
      role: userRole
    });
    
    return enrichedBookings;

  } catch (fetchError) {
    logger.error('Exception in fetchHostBookings', {
      component: 'booking-data-fetcher',
      action: 'fetch_host_bookings_exception',
      userId,
      role: userRole,
      metadata: { filters }
    }, fetchError as Error);
    throw fetchError;
  }
};
