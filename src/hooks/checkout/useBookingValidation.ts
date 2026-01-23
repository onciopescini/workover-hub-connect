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
  space_id: string;
  user_id: string;
  start_time: string;
  end_time: string;
  guests_count: number;
  confirmation_type: 'instant' | 'host_approval';
  client_base_price: number;
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
      space_id: spaceId,
      user_id: userId,
      start_time: startIso,
      end_time: endIso,
      guests_count: guestsCount,
      confirmation_type: confirmationType,
      client_base_price: clientBasePrice ?? 0
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
