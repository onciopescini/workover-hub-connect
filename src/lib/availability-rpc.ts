
import { supabase } from "@/integrations/supabase/client";

// Funzione RPC ottimizzata per recuperare disponibilità spazio
export const fetchOptimizedSpaceAvailability = async (
  spaceId: string,
  startDate: string,
  endDate: string
) => {
  const { data, error } = await supabase.rpc('get_space_availability_optimized', {
    space_id_param: spaceId,
    start_date_param: startDate,
    end_date_param: endDate
  });

  if (error) {
    console.error('RPC availability fetch error:', error);
    throw error;
  }

  return data || [];
};

// Funzione RPC per validare slot con lock
export const validateBookingSlotWithLock = async (
  spaceId: string,
  date: string,
  startTime: string,
  endTime: string,
  userId: string
) => {
  const { data, error } = await supabase.rpc('validate_booking_slot_with_lock', {
    space_id_param: spaceId,
    date_param: date,
    start_time_param: startTime,
    end_time_param: endTime,
    user_id_param: userId
  });

  if (error) {
    console.error('RPC slot validation error:', error);
    throw error;
  }

  return data;
};

// Funzione per ottenere suggerimenti di orari alternativi
export const getAlternativeTimeSlots = async (
  spaceId: string,
  date: string,
  durationHours: number
): Promise<string[]> => {
  const { data, error } = await supabase.rpc('get_alternative_time_slots', {
    space_id_param: spaceId,
    date_param: date,
    duration_hours_param: durationHours
  });

  if (error) {
    console.error('Error getting alternative slots:', error);
    return [];
  }

  return data || [];
};
