import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

interface TimeSlot {
  time: string;
  available: number;
  total: number;
}

interface HourlyAvailabilityResult {
  slots: TimeSlot[];
  maxCapacity: number;
}

const generateTimeSlots = (): string[] => {
  const slots: string[] = [];
  for (let hour = 0; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      slots.push(`${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`);
    }
  }
  return slots;
};

const fetchHourlyAvailability = async (
  spaceId: string,
  date: Date
): Promise<HourlyAvailabilityResult> => {
  // Get space max capacity
  const { data: space, error: spaceError } = await supabase
    .from('spaces')
    .select('max_capacity')
    .eq('id', spaceId)
    .single();

  if (spaceError || !space) {
    throw new Error('Failed to fetch space details');
  }

  const maxCapacity = space.max_capacity;
  const dateStr = format(date, 'yyyy-MM-dd');

  // Get all bookings for this space on this date
  const { data: bookings, error: bookingsError } = await supabase
    .from('bookings')
    .select('start_time, end_time, guests_count')
    .eq('space_id', spaceId)
    .eq('booking_date', dateStr)
    .in('status', ['pending', 'confirmed']);

  if (bookingsError) {
    throw new Error('Failed to fetch bookings');
  }

  // Generate all time slots
  const allSlots = generateTimeSlots();
  
  // Calculate availability for each slot
  const slots: TimeSlot[] = allSlots.map((slotTime) => {
    let totalBooked = 0;

    // Check each booking to see if it overlaps with this slot
    bookings?.forEach((booking) => {
      const bookingStart = booking.start_time;
      const bookingEnd = booking.end_time;
      
      // Check if slot time falls within booking time range
      if (bookingStart && bookingEnd && slotTime >= bookingStart && slotTime < bookingEnd) {
        totalBooked += booking.guests_count || 1;
      }
    });

    const available = Math.max(0, maxCapacity - totalBooked);

    return {
      time: slotTime,
      available,
      total: maxCapacity,
    };
  });

  return { slots, maxCapacity };
};

export const useSpaceHourlyAvailability = (spaceId: string, date: Date) => {
  return useQuery({
    queryKey: ['space-hourly-availability', spaceId, format(date, 'yyyy-MM-dd')],
    queryFn: () => fetchHourlyAvailability(spaceId, date),
    staleTime: 1000 * 60 * 2, // 2 minutes
    gcTime: 1000 * 60 * 5, // 5 minutes
    enabled: !!spaceId && !!date,
  });
};