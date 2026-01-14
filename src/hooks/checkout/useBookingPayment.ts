
import { supabase } from '@/integrations/supabase/client';
import { API_ENDPOINTS } from '@/constants';
import { useLogger } from '@/hooks/useLogger';

export function useBookingPayment() {
  const { error } = useLogger({ context: 'useBookingPayment' });

  const initializePayment = async (bookingId: string) => {
    try {
      const { data: sessionData, error: fnError } = await supabase.functions.invoke(
        API_ENDPOINTS.CREATE_CHECKOUT,
        {
          body: {
            booking_id: bookingId,
            origin: window.location.origin
          }
        }
      );

      if (fnError) {
          error('Payment Function Error', fnError);
          throw new Error(`Payment initialization failed: ${fnError.message}`);
      }

      if (!sessionData?.url) {
          error('No payment URL', sessionData);
          throw new Error('Payment session created but no URL returned');
      }

      return { url: sessionData.url };
    } catch (e) {
      throw e;
    }
  };

  return { initializePayment };
}
