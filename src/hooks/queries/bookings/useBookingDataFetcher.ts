
import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";
import { BookingFilter } from "./useBookingFilters";

export const fetchCoworkerBookings = async (userId: string, filters?: BookingFilter) => {
  logger.debug('Fetching coworker bookings', {
    component: 'booking-data-fetcher',
    action: 'fetch_coworker_bookings',
    userId,
    metadata: { 
      filtersApplied: filters ? JSON.stringify(filters) : 'none'
    }
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
        metadata: { 
          filtersApplied: filters ? JSON.stringify(filters) : 'none'
        }
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
      metadata: { 
        filtersApplied: filters ? JSON.stringify(filters) : 'none'
      }
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
    metadata: { 
      filtersApplied: filters ? JSON.stringify(filters) : 'none'
    }
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

    // ONDATA 2: FIX 2.2 - Eliminate N+1 query by joining coworker profiles in single query
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
        coworker:profiles!user_id (
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
        metadata: { 
          filtersApplied: filters ? JSON.stringify(filters) : 'none'
        }
      }, bookingsError);
      throw new Error(`Failed to fetch host bookings: ${bookingsError.message}`);
    }

    // No need for separate profile fetch - already joined via FK!

    logger.debug('Host bookings fetched successfully with coworker profiles joined', {
      component: 'booking-data-fetcher',
      action: 'fetch_host_bookings_success',
      count: bookings?.length || 0,
      userId,
      role: userRole
    });
    
    return bookings || [];

  } catch (fetchError) {
    logger.error('Exception in fetchHostBookings', {
      component: 'booking-data-fetcher',
      action: 'fetch_host_bookings_exception',
      userId,
      role: userRole,
      metadata: { 
        filtersApplied: filters ? JSON.stringify(filters) : 'none'
      }
    }, fetchError as Error);
    throw fetchError;
  }
};
