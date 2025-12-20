
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
        workspaces (
          id,
          name,
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

    logger.debug('Coworker bookings fetched successfully', {
      component: 'booking-data-fetcher',
      action: 'fetch_coworker_bookings_success',
      count: bookings?.length || 0,
      userId
    });
    
    // Explicitly cast or validate if needed, but the structure now matches BookingWithDetails (mostly)
    return bookings as any[];

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
    // Determine the host's workspaces first to filter bookings?
    // Or simpler: join workspaces!inner to filter by host_id

    let query = supabase
      .from('bookings')
      .select(`
        *,
        workspaces!inner (
          id,
          name,
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
      .eq('workspaces.host_id', userId);

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

    logger.debug('Host bookings fetched successfully with coworker profiles joined', {
      component: 'booking-data-fetcher',
      action: 'fetch_host_bookings_success',
      count: bookings?.length || 0,
      userId,
      role: userRole
    });
    
    return bookings as any[];

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
