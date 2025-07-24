import { supabase } from "@/integrations/supabase/client";

export interface CalendarBooking {
  id: string;
  title: string;
  customer: string;
  space: string;
  startTime: string;
  endTime: string;
  date: string;
  status: string;
  attendees: number;
  price: number;
}

export interface CalendarStats {
  todayBookings: number;
  weekBookings: number;
  occupancyRate: number;
}

export const getHostCalendarBookings = async (hostId: string, month?: number, year?: number): Promise<CalendarBooking[]> => {
  try {
    let query = supabase
      .from('bookings')
      .select(`
        *,
        spaces!inner (
          host_id,
          title,
          price_per_day
        ),
        profiles (
          first_name,
          last_name
        )
      `)
      .eq('spaces.host_id', hostId)
      .in('status', ['pending', 'confirmed'])
      .order('booking_date', { ascending: true })
      .order('start_time', { ascending: true });

    // Filter by month/year if provided
    if (month !== undefined && year !== undefined) {
      const startDate = new Date(year, month, 1).toISOString().split('T')[0];
      const endDate = new Date(year, month + 1, 0).toISOString().split('T')[0];
      query = query.gte('booking_date', startDate).lte('booking_date', endDate);
    }

    const { data: bookings, error } = await query;

    if (error) throw error;

    return bookings?.map(booking => ({
      id: booking.id,
      title: `Prenotazione ${booking.spaces?.title || 'Spazio'}`,
      customer: booking.profiles 
        ? `${booking.profiles.first_name} ${booking.profiles.last_name}`
        : 'Cliente',
      space: booking.spaces?.title || 'Spazio',
      startTime: booking.start_time || '09:00',
      endTime: booking.end_time || '17:00',
      date: booking.booking_date ?? new Date().toISOString().split('T')[0],
      status: booking.status || 'pending',
      attendees: Math.floor(Math.random() * 10) + 1, // Would need actual data
      price: booking.spaces?.price_per_day || 0
    })) || [];

  } catch (error) {
    console.error('Error fetching calendar bookings:', error);
    return [];
  }
};

export const getHostCalendarStats = async (hostId: string): Promise<CalendarStats> => {
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
      .eq('booking_date', today)
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

    // Calculate occupancy rate (simplified)
    const totalSpaces = await getHostSpaceCount(hostId);
    const daysInWeek = 7;
    const maxPossibleBookings = totalSpaces * daysInWeek;
    const occupancyRate = maxPossibleBookings > 0 
      ? (weekBookings?.length || 0) / maxPossibleBookings * 100 
      : 0;

    return {
      todayBookings: todayBookings?.length || 0,
      weekBookings: weekBookings?.length || 0,
      occupancyRate: Math.min(Math.round(occupancyRate), 100)
    };

  } catch (error) {
    console.error('Error fetching calendar stats:', error);
    return {
      todayBookings: 0,
      weekBookings: 0,
      occupancyRate: 0
    };
  }
};

const getHostSpaceCount = async (hostId: string): Promise<number> => {
  try {
    const { count, error } = await supabase
      .from('spaces')
      .select('*', { count: 'exact', head: true })
      .eq('host_id', hostId)
      .eq('published', true);

    if (error) throw error;
    return count || 0;

  } catch (error) {
    console.error('Error fetching host space count:', error);
    return 0;
  }
};