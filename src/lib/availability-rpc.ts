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

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

// Type guard per ValidationResult
function isValidationResult(data: unknown): data is ValidationResult {
  if (!isRecord(data)) {
    return false;
  }

  const valid = data['valid'];
  const conflicts = data['conflicts'];
  const message = data['message'];

  return (
    typeof valid === 'boolean' &&
    Array.isArray(conflicts) &&
    typeof message === 'string'
  );
}

// Funzione RPC ottimizzata per recuperare disponibilità spazio
export const fetchOptimizedSpaceAvailability = async (
  spaceId: string,
  startDate: string,
  endDate: string
) => {
  const { data, error } = await supabase.rpc('get_space_availability_v2', {
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
