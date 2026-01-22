import { supabase } from "@/integrations/supabase/client";
import { sreLogger } from '@/lib/sre-logger';

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
    // Use workspaces table and maybeSingle to handle missing/hidden spaces gracefully
    const { data: space, error: spaceError } = await (supabase
      .from('spaces') as any)
      .select('max_capacity')
      .eq('id', spaceId)
      .maybeSingle();

    if (spaceError) {
      sreLogger.error('Error fetching space capacity', { 
        context: 'getAvailableCapacity',
        spaceId 
      }, spaceError as Error);
      return { availableSpots: 0, maxCapacity: 0, totalBooked: 0 };
    }

    if (!space) {
      sreLogger.warn('Space not found during capacity check', {
        context: 'getAvailableCapacity',
        spaceId
      });
      return { availableSpots: 0, maxCapacity: 0, totalBooked: 0 };
    }
    
    const maxCapacity = space.max_capacity ?? 1;

    // Get total guests booked for overlapping time slots
    // A booking overlaps if:
    // 1. It starts before our endTime AND ends after our startTime
    const { data: bookings, error: bookingsError } = await supabase
      .from('bookings')
      .select('guests_count')
      .eq('space_id', spaceId)
      .eq('booking_date', date)
      .in('status', ['pending', 'confirmed'])
      .lt('start_time', endTime)
      .gt('end_time', startTime);

    if (bookingsError) {
      sreLogger.error('Error fetching bookings', { 
        context: 'getAvailableCapacity',
        spaceId,
        date,
        startTime,
        endTime
      }, bookingsError as Error);
      return { 
        availableSpots: maxCapacity, 
        maxCapacity: maxCapacity, 
        totalBooked: 0 
      };
    }

    const totalBooked = bookings?.reduce((sum, b) => sum + (b.guests_count || 0), 0) || 0;
    const availableSpots = Math.max(0, maxCapacity - totalBooked);

    return {
      availableSpots,
      maxCapacity: maxCapacity,
      totalBooked
    };
  } catch (error) {
    sreLogger.error('Error in getAvailableCapacity', { 
      context: 'getAvailableCapacity',
      spaceId,
      date,
      startTime,
      endTime
    }, error as Error);
    return { availableSpots: 0, maxCapacity: 0, totalBooked: 0 };
  }
}
