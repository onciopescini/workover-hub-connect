
import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";
import { BookingFilter } from "./useBookingFilters";

export const fetchCoworkerBookings = async (userId: string, filters?: BookingFilter) => {
  logger.debug('Fetching coworker bookings', {
    operation: 'fetch_coworker_bookings',
    userId,
    filters
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
        operation: 'fetch_coworker_bookings_db_error',
        userId,
        filters
      }, queryError);
      throw new Error(`Failed to fetch coworker bookings: ${queryError.message}`);
    }

    logger.debug('Coworker bookings fetched successfully', {
      operation: 'fetch_coworker_bookings_success',
      count: data?.length || 0,
      userId
    });
    
    return data || [];

  } catch (fetchError) {
    logger.error('Exception in fetchCoworkerBookings', {
      operation: 'fetch_coworker_bookings_exception',
      userId,
      filters
    }, fetchError as Error);
    throw fetchError;
  }
};

export const fetchHostBookings = async (userId: string, userRole: string, filters?: BookingFilter) => {
  logger.debug('Fetching host bookings', {
    operation: 'fetch_host_bookings',
    userId,
    userRole,
    filters
  });
  
  try {
    // First, get user's spaces with error handling
    const { data: userSpaces, error: spacesError } = await supabase
      .from('spaces')
      .select('id, title')
      .eq('host_id', userId);

    if (spacesError) {
      logger.error('Error fetching user spaces', {
        operation: 'fetch_user_spaces_error',
        userId,
        userRole
      }, spacesError);
      throw new Error(`Failed to fetch user spaces: ${spacesError.message}`);
    }

    if (!userSpaces || userSpaces.length === 0) {
      logger.debug('No spaces found for host', {
        operation: 'fetch_user_spaces_empty',
        userId,
        userRole
      });
      return [];
    }

    const spaceIds = userSpaces.map(space => space.id);
    logger.debug('User spaces found', {
      operation: 'fetch_user_spaces_success',
      spacesCount: spaceIds.length,
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
        operation: 'fetch_host_bookings_db_error',
        userId,
        userRole,
        filters
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
        operation: 'fetch_coworker_profiles_warning',
        userId,
        userIds: userIds.length
      }, profilesError);
    }

    // Manually join the coworker data to avoid foreign key issues
    const enrichedBookings = (bookings || []).map(booking => ({
      ...booking,
      coworker: coworkerProfiles?.find(profile => profile.id === booking.user_id) || null
    }));

    logger.debug('Host bookings fetched and enriched successfully', {
      operation: 'fetch_host_bookings_success',
      enrichedCount: enrichedBookings.length,
      userId,
      userRole
    });
    
    return enrichedBookings;

  } catch (fetchError) {
    logger.error('Exception in fetchHostBookings', {
      operation: 'fetch_host_bookings_exception',
      userId,
      userRole,
      filters
    }, fetchError as Error);
    throw fetchError;
  }
};
