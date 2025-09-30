import { supabase } from "@/integrations/supabase/client";

/**
 * Get available capacity for a specific time slot
 */
export async function getAvailableCapacity(
  spaceId: string,
  date: string,
  startTime: string,
  endTime: string
): Promise<{
  availableSpots: number;
  maxCapacity: number;
  totalBooked: number;
}> {
  try {
    // Get space max capacity
    const { data: space, error: spaceError } = await supabase
      .from('spaces')
      .select('max_capacity')
      .eq('id', spaceId)
      .single();

    if (spaceError || !space) {
      console.error('Error fetching space capacity:', spaceError);
      return { availableSpots: 0, maxCapacity: 0, totalBooked: 0 };
    }

    // Get total guests booked for overlapping time slots
    const { data: bookings, error: bookingsError } = await supabase
      .from('bookings')
      .select('guests_count')
      .eq('space_id', spaceId)
      .eq('booking_date', date)
      .in('status', ['pending', 'confirmed'])
      .or(
        `and(start_time.lte.${startTime},end_time.gt.${startTime}),` +
        `and(start_time.lt.${endTime},end_time.gte.${endTime}),` +
        `and(start_time.gte.${startTime},end_time.lte.${endTime})`
      );

    if (bookingsError) {
      console.error('Error fetching bookings:', bookingsError);
      return { 
        availableSpots: space.max_capacity, 
        maxCapacity: space.max_capacity, 
        totalBooked: 0 
      };
    }

    const totalBooked = bookings?.reduce((sum, b) => sum + (b.guests_count || 0), 0) || 0;
    const availableSpots = Math.max(0, space.max_capacity - totalBooked);

    return {
      availableSpots,
      maxCapacity: space.max_capacity,
      totalBooked
    };
  } catch (error) {
    console.error('Error in getAvailableCapacity:', error);
    return { availableSpots: 0, maxCapacity: 0, totalBooked: 0 };
  }
}
