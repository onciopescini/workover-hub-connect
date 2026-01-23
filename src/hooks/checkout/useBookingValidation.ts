import { supabase } from '@/integrations/supabase/client';
import { useLogger } from '@/hooks/useLogger';
import { createBookingDateTime } from '@/lib/date-time';

export interface ValidationParams {
  spaceId: string;
  userId: string;
  dateStr: string;
  startTime: string;
  endTime: string;
  guestsCount: number;
  confirmationType: 'instant' | 'host_approval';
  clientBasePrice?: number;
}

type ValidateAndReserveSlotParams = {
  p_space_id: string;
  p_user_id: string;
  p_start_time: string;
  p_end_time: string;
  p_guests_count: number;
  p_confirmation_type: 'instant' | 'host_approval';
  p_client_base_price: number;
};

export function useBookingValidation() {
  const { debug, error: logError } = useLogger({ context: 'useBookingValidation' });

  const validateBooking = async (params: ValidationParams) => {
    debug('Validating booking slot', params);

    const {
      spaceId,
      userId,
      dateStr,
      startTime,
      endTime,
      guestsCount,
      confirmationType,
      clientBasePrice
    } = params;

    // Convert to ISO strings (TIMESTAMPTZ)
    const startIso = createBookingDateTime(dateStr, startTime).toISOString();
    const endIso = createBookingDateTime(dateStr, endTime).toISOString();

    const rpcParams: ValidateAndReserveSlotParams = {
      p_space_id: spaceId,
      p_user_id: userId,
      p_start_time: startIso,
      p_end_time: endIso,
      p_guests_count: guestsCount,
      p_confirmation_type: confirmationType,
      p_client_base_price: clientBasePrice ?? 0
    };

    const { data, error } = await supabase.rpc('validate_and_reserve_slot', rpcParams);

    if (error) {
      logError('Validation RPC Error', error);
      throw new Error(`Validation failed: ${error.message}`);
    }

    // Cast the response to unknown first to avoid TS errors, then to the expected shape
    const validationData = data as unknown as { success?: boolean; error?: string } | null;

    if (validationData && validationData.success === false) {
      const errorMessage = validationData.error || 'Slot validation returned false';
      logError('Validation Data Error', new Error(errorMessage));
      throw new Error(errorMessage);
    }

    return validationData;
  };

  return { validateBooking };
}
