import { supabase } from "@/integrations/supabase/client";
import { sreLogger } from '@/lib/sre-logger';
import type { BookingWithSpaceAndProfileJoin } from "@/types/supabase-joins";

export interface CalendarMetrics {
  todayBookings: number;
  weekBookings: number;
  monthBookings: number;
  pendingApprovals: number;
  averageRating: number;
  occupancyRate: number;
}

export interface CalendarStats {
  metrics: CalendarMetrics;
  recentBookings: Array<{
    id: string;
    host_id: string;
    guest_name: string;
    space_name: string;
    booking_date: string;
    start_time: string | null;
    end_time: string | null;
    status: string;
  }>;
}

// Enhanced calendar data with real calculations
export const getHostCalendarData = async (hostId: string): Promise<CalendarMetrics> => {
  if (!hostId) {
    throw new Error('Host ID is required');
  }
  
  try {
    const today = new Date().toISOString().split('T')[0];
    
    // Get today's bookings
    const { data: todayBookings, error: todayError } = await supabase
      .from('bookings')
      .select(`
        id,
        spaces!inner (host_id)
       `)
       .eq('spaces.host_id', hostId)
       .eq('booking_date', today as string)
       .in('status', ['pending', 'confirmed']);

    if (todayError) throw todayError;

    // Get this week's bookings
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);

    const { data: weekBookings, error: weekError } = await supabase
      .from('bookings')
      .select(`
        id,
        spaces!inner (host_id)
      `)
      .eq('spaces.host_id', hostId)
      .gte('booking_date', weekStart.toISOString().split('T')[0])
      .lte('booking_date', weekEnd.toISOString().split('T')[0])
      .in('status', ['pending', 'confirmed']);

    if (weekError) throw weekError;

    // Get this month's bookings
    const monthStart = new Date();
    monthStart.setDate(1);
    const monthEnd = new Date(monthStart);
    monthEnd.setMonth(monthEnd.getMonth() + 1);
    monthEnd.setDate(0);

    const { data: monthBookings, error: monthError } = await supabase
      .from('bookings')
      .select(`
        id,
        spaces!inner (host_id)
      `)
      .eq('spaces.host_id', hostId)
      .gte('booking_date', monthStart.toISOString().split('T')[0])
      .lte('booking_date', monthEnd.toISOString().split('T')[0])
      .in('status', ['pending', 'confirmed']);

    if (monthError) throw monthError;

    // Get pending approvals
    const { data: pendingBookings, error: pendingError } = await supabase
      .from('bookings')
      .select(`
        id,
        spaces!inner (host_id)
      `)
      .eq('spaces.host_id', hostId)
      .eq('status', 'pending');

    if (pendingError) throw pendingError;

    // Get average rating for host's spaces
    const { data: reviews, error: reviewsError } = await supabase
      .from('booking_reviews')
      .select(`
        rating,
        bookings!inner (
          spaces!inner (host_id)
        )
      `)
      .eq('bookings.spaces.host_id', hostId);

    if (reviewsError) throw reviewsError;

    const ratings = reviews?.map(r => r.rating) || [];
    const averageRating = ratings.length > 0 
      ? ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length 
      : 0;

    // Mock occupancy rate calculation (simplified)
    const totalBookings = monthBookings?.length || 0;
    const occupancyRate = Math.min(100, totalBookings * 3); // Simplified calculation

    return {
      todayBookings: todayBookings?.length || 0,
      weekBookings: weekBookings?.length || 0,
      monthBookings: monthBookings?.length || 0,
      pendingApprovals: pendingBookings?.length || 0,
      averageRating: Math.round(averageRating * 10) / 10,
      occupancyRate: Math.round(occupancyRate)
    };

  } catch (error) {
    sreLogger.error('Error fetching calendar data', { 
      context: 'getHostCalendarData',
      hostId 
    }, error as Error);
    return {
      todayBookings: 0,
      weekBookings: 0,
      monthBookings: 0,
      pendingApprovals: 0,
      averageRating: 0,
      occupancyRate: 0
    };
  }
};

export const getHostCalendarStats = async (hostId: string): Promise<CalendarStats> => {
  try {
    const metrics = await getHostCalendarData(hostId);
    
    // Get recent bookings with details
    const { data: recentBookings, error } = await supabase
      .from('bookings')
      .select(`
        id,
        booking_date,
        start_time,
        end_time,
        status,
        spaces!inner (
          title,
          host_id
        ),
        profiles (
          first_name,
          last_name
        )
      `)
      .eq('spaces.host_id', hostId)
      .order('created_at', { ascending: false })
      .limit(10)
      .overrideTypes<BookingWithSpaceAndProfileJoin[]>();

    if (error) throw error;

    const formattedBookings = (recentBookings || []).map(booking => ({
      id: booking.id,
      host_id: hostId,
      guest_name: booking.profiles?.first_name && booking.profiles?.last_name 
        ? `${booking.profiles.first_name} ${booking.profiles.last_name}`
        : 'Guest',
      space_name: booking.spaces?.title || 'Spazio',
      booking_date: booking.booking_date,
      start_time: booking.start_time,
      end_time: booking.end_time,
      status: booking.status || 'pending'
    }));

    return {
      metrics,
      recentBookings: formattedBookings
    };

  } catch (error) {
    sreLogger.error('Error fetching calendar stats', { 
      context: 'getHostCalendarStats',
      hostId 
    }, error as Error);
    return {
      metrics: {
        todayBookings: 0,
        weekBookings: 0,
        monthBookings: 0,
        pendingApprovals: 0,
        averageRating: 0,
        occupancyRate: 0
      },
      recentBookings: []
    };
  }
};
