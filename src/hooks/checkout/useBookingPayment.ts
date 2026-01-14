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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      logError('Payment Function Error', fnError as any);
      throw new Error(`Payment initialization failed: ${fnError.message}`);
    }

    if (!sessionData?.url) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      logError('No payment URL', sessionData as any);
      throw new Error('Payment session created but no URL returned');
    }

    return sessionData.url;
  };

  return { initializePayment };
}
