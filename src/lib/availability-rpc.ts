
import { supabase } from "@/integrations/supabase/client";

// RPC function per ottimizzazione query di disponibilità
export const fetchOptimizedSpaceAvailability = async (
  spaceId: string,
  startDate: string,
  endDate: string
) => {
  try {
    const { data, error } = await supabase.rpc('get_space_availability_optimized', {
      space_id_param: spaceId,
      start_date_param: startDate,
      end_date_param: endDate
    });

    if (error) {
      console.error('RPC Error:', error);
      // Fallback to standard query
      return await fallbackAvailabilityQuery(spaceId, startDate, endDate);
    }

    return data || [];
  } catch (error) {
    console.error('Availability RPC failed:', error);
    return await fallbackAvailabilityQuery(spaceId, startDate, endDate);
  }
};

// Fallback query standard se RPC non disponibile
const fallbackAvailabilityQuery = async (
  spaceId: string,
  startDate: string,
  endDate: string
) => {
  const { data, error } = await supabase
    .from('bookings')
    .select('*')
    .eq('space_id', spaceId)
    .gte('booking_date', startDate)
    .lte('booking_date', endDate)
    .in('status', ['pending', 'confirmed']);

  if (error) throw error;
  return data || [];
};

// Interface for validation result
interface ValidationResult {
  valid: boolean;
  conflicts: any[];
  message: string;
}

// RPC per validazione real-time con lock
export const validateBookingSlotWithLock = async (
  spaceId: string,
  date: string,
  startTime: string,
  endTime: string,
  userId: string
): Promise<ValidationResult> => {
  try {
    const { data, error } = await supabase.rpc('validate_booking_slot_with_lock', {
      space_id_param: spaceId,
      date_param: date,
      start_time_param: startTime,
      end_time_param: endTime,
      user_id_param: userId
    });

    if (error) {
      console.error('Validation RPC Error:', error);
      throw error;
    }

    // Safe parsing of JSON response
    if (data && typeof data === 'object') {
      const result = data as any;
      return {
        valid: Boolean(result.valid),
        conflicts: Array.isArray(result.conflicts) ? result.conflicts : [],
        message: String(result.message || 'Unknown response')
      };
    }

    throw new Error('Invalid response format from validation RPC');
  } catch (error) {
    console.error('Booking validation failed:', error);
    throw error;
  }
};

// RPC per suggerimenti alternativi
export const getAlternativeTimeSlots = async (
  spaceId: string,
  date: string,
  duration: number
): Promise<string[]> => {
  try {
    const { data, error } = await supabase.rpc('get_alternative_time_slots', {
      space_id_param: spaceId,
      date_param: date,
      duration_hours_param: duration
    });

    if (error) {
      console.warn('Alternative slots RPC error:', error);
      return [];
    }

    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.warn('Failed to get alternative slots:', error);
    return [];
  }
};
