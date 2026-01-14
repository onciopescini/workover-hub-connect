import { supabase } from '@/integrations/supabase/client';
import { useLogger } from '@/hooks/useLogger';

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
  space_id_param: string;
  date_param: string;
  start_time_param: string;
  end_time_param: string;
  user_id_param: string;
  guests_count_param: number;
  confirmation_type_param: 'instant' | 'host_approval';
  client_base_price_param?: number;
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

    const rpcParams: ValidateAndReserveSlotParams = {
      space_id_param: spaceId,
      date_param: dateStr,
      start_time_param: startTime,
      end_time_param: endTime,
      user_id_param: userId,
      guests_count_param: guestsCount,
      confirmation_type_param: confirmationType,
      client_base_price_param: clientBasePrice
    };

    const { data, error } = await supabase.rpc('validate_and_reserve_slot', rpcParams);

    if (error) {
      logError('Validation RPC Error', error);
      throw new Error(`Validation failed: ${error.message}`);
    }

    // Cast the response to unknown first to avoid TS errors, then to the expected shape
    const validationData = data as unknown as { success?: boolean; error?: string };

    if (validationData && validationData.success === false) {
      logError('Validation Data Error', validationData);
      throw new Error(validationData.error || 'Slot validation returned false');
    }

    return validationData;
  };

  return { validateBooking };
}
