import { supabase } from '@/integrations/supabase/client';
import { useLogger } from '@/hooks/useLogger';
import { API_ENDPOINTS } from '@/constants';

export interface PaymentParams {
  bookingId: string;
  hostStripeAccountId: string;
}

export function useBookingPayment() {
  const { debug, error: logError } = useLogger({ context: 'useBookingPayment' });

  const initializePayment = async (params: PaymentParams) => {
    debug('Initializing payment flow', params);
    const { bookingId, hostStripeAccountId } = params;

    if (!hostStripeAccountId) {
      throw new Error('Host Stripe account ID is missing');
    }

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
      logError('Payment Function Error', fnError);
      throw new Error(`Payment initialization failed: ${fnError.message}`);
    }

    if (!sessionData?.url) {
      logError('No payment URL', sessionData);
      throw new Error('Payment session created but no URL returned');
    }

    return sessionData.url;
  };

  return { initializePayment };
}
