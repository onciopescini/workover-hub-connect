
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { useLogger } from '@/hooks/useLogger';

export interface BookingValidationParams {
  spaceId: string;
  userId: string;
  date: Date;
  startTime: string;
  endTime: string;
  guestsCount: number;
  confirmationType: 'instant' | 'host_approval';
  clientBasePrice?: number;
}

export function useBookingValidation() {
  const { error, debug } = useLogger({ context: 'useBookingValidation' });

  const validateBooking = async (params: BookingValidationParams): Promise<boolean> => {
    debug('Validating booking', { ...params, date: format(params.date, 'yyyy-MM-dd') });

    try {
      const dateStr = format(params.date, 'yyyy-MM-dd');

      const validationResult = await supabase.rpc('validate_and_reserve_slot', {
        space_id_param: params.spaceId,
        date_param: dateStr,
        start_time_param: params.startTime,
        end_time_param: params.endTime,
        user_id_param: params.userId,
        guests_count_param: params.guestsCount,
        confirmation_type_param: params.confirmationType,
        client_base_price_param: params.clientBasePrice
      } as any);

      if (validationResult.error) {
        error('Validation RPC Error', validationResult.error);
        throw new Error(`Validation failed: ${validationResult.error.message}`);
      }

      const validationData = validationResult.data as { success?: boolean; error?: string };
      if (validationData && validationData.success === false) {
         error('Validation Data Error', validationData);
         throw new Error(validationData.error || 'Slot validation returned false');
      }

      return true;
    } catch (e) {
      // Re-throw to be handled by orchestrator
      throw e;
    }
  };

  return { validateBooking };
}
