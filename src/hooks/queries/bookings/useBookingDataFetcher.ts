
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
    // 1. Fetch bookings first (Decoupled from space details)
    let query = supabase
      .from('bookings')
      .select(`
        *,
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

    const { data: bookings, error: queryError } = await query.order('created_at', { ascending: false });

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

    if (!bookings || bookings.length === 0) {
      return [];
    }

    // 2. Fetch workspace details for these bookings from 'workspaces' table
    const spaceIds = [...new Set(bookings.map(b => b.space_id))];

    const { data: workspaces, error: workspaceError } = await supabase
      .from('workspaces')
      .select('id, name, address, photos, host_id, price_per_day, confirmation_type')
      .in('id', spaceIds);

    if (workspaceError) {
      logger.error('Error fetching workspaces for bookings', {
        component: 'booking-data-fetcher',
        action: 'fetch_workspaces_error',
        userId,
        errorMessage: workspaceError.message
      }, workspaceError);
      throw new Error(`Failed to fetch workspace details: ${workspaceError.message}`);
    }

    const workspaceMap = new Map(workspaces?.map(w => [w.id, w]));

    // 3. Merge data and map columns (name -> title)
    const enrichedBookings = bookings.map(booking => {
      const spaceData = workspaceMap.get(booking.space_id);
      return {
        ...booking,
        space: spaceData ? {
          ...spaceData,
          title: spaceData.name // Map name to title for legacy compatibility
        } : null
      };
    });

    logger.debug('Coworker bookings fetched successfully', {
      component: 'booking-data-fetcher',
      action: 'fetch_coworker_bookings_success',
      count: enrichedBookings.length,
      userId
    });
    
    return enrichedBookings;

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
    // 1. Fetch user's workspaces from 'workspaces' table
    const { data: userSpaces, error: spacesError } = await supabase
      .from('workspaces')
      .select('id, name, address, photos, host_id, price_per_day, confirmation_type')
      .eq('host_id', userId);

    if (spacesError) {
      logger.error('Error fetching user workspaces', {
        component: 'booking-data-fetcher',
        action: 'fetch_user_workspaces_error',
        userId,
        role: userRole,
        errorMessage: spacesError.message
      }, spacesError);
      throw new Error(`Failed to fetch user workspaces: ${spacesError.message}`);
    }

    if (!userSpaces || userSpaces.length === 0) {
      logger.debug('No workspaces found for host', {
        component: 'booking-data-fetcher',
        action: 'fetch_user_workspaces_empty',
        userId,
        role: userRole
      });
      return [];
    }

    const spaceIds = userSpaces.map(space => space.id);
    const workspaceMap = new Map(userSpaces.map(w => [w.id, w]));

    logger.debug('User workspaces found', {
      component: 'booking-data-fetcher',
      action: 'fetch_user_workspaces_success',
      count: spaceIds.length,
      userId
    });

    // 2. Fetch bookings for these spaces
    // Eliminate N+1 query by joining coworker profiles in single query
    let query = supabase
      .from('bookings')
      .select(`
        *,
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

    // 3. Merge workspace details back into bookings
    const enrichedBookings = bookings.map(booking => {
      const spaceData = workspaceMap.get(booking.space_id);
      return {
        ...booking,
        space: spaceData ? {
          ...spaceData,
          title: spaceData.name // Map name to title
        } : null
      };
    });

    logger.debug('Host bookings fetched successfully with coworker profiles joined', {
      component: 'booking-data-fetcher',
      action: 'fetch_host_bookings_success',
      count: enrichedBookings?.length || 0,
      userId,
      role: userRole
    });
    
    return enrichedBookings || [];

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
