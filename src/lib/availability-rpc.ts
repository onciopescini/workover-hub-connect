
import { supabase } from "@/integrations/supabase/client";

// Interface per il risultato di validazione RPC
export interface ValidationResult {
  valid: boolean;
  conflicts: any[];
  message: string;
}

// Type guard per ValidationResult
function isValidationResult(data: any): data is ValidationResult {
  return (
    typeof data === 'object' &&
    data !== null &&
    typeof data.valid === 'boolean' &&
    Array.isArray(data.conflicts) &&
    typeof data.message === 'string'
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
): Promise<ValidationResult> => {
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

  // Valida la struttura della risposta con il type guard
  if (!isValidationResult(data)) {
    console.error('Invalid response structure from validate_booking_slot_with_lock:', data);
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
    console.error('Error getting alternative slots:', error);
    return [];
  }

  return data || [];
};
