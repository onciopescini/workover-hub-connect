import { supabase } from "@/integrations/supabase/client";
import { sreLogger } from '@/lib/sre-logger';

// Interface per il risultato di validazione RPC
interface BookingConflict {
  id: string;
  start_time: string;
  end_time: string;
  status: string;
  user_id: string;
}

export interface ValidationResult {
  valid: boolean;
  conflicts: BookingConflict[];
  message: string;
}

// Type guard per ValidationResult
function isValidationResult(data: unknown): data is ValidationResult {
  return (
    typeof data === 'object' &&
    data !== null &&
    'valid' in data &&
    'conflicts' in data &&
    'message' in data &&
    typeof (data as any).valid === 'boolean' &&
    Array.isArray((data as any).conflicts) &&
    typeof (data as any).message === 'string'
  );
}

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
    sreLogger.error('RPC availability fetch error', { 
      context: 'fetchOptimizedSpaceAvailability',
      spaceId,
      startDate,
      endDate
    }, error as Error);
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
): Promise<ValidationResult> => {
  const { data, error } = await supabase.rpc('validate_booking_slot_with_lock', {
    space_id_param: spaceId,
    date_param: date,
    start_time_param: startTime,
    end_time_param: endTime,
    user_id_param: userId
  });

  if (error) {
    sreLogger.error('RPC slot validation error', { 
      context: 'validateBookingSlotWithLock',
      spaceId,
      date,
      startTime,
      endTime,
      userId
    }, error as Error);
    throw error;
  }

  // Valida la struttura della risposta con il type guard
  if (!isValidationResult(data)) {
    sreLogger.error('Invalid response structure from validate_booking_slot_with_lock', { 
      context: 'validateBookingSlotWithLock',
      spaceId,
      data 
    }, new Error('Invalid response format'));
    throw new Error('Invalid response format from validation RPC');
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
    sreLogger.error('Error getting alternative slots', { 
      context: 'getAlternativeTimeSlots',
      spaceId,
      date,
      durationHours
    }, error as Error);
    return [];
  }

  return data || [];
};
