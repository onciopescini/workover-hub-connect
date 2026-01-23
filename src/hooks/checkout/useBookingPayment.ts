import { supabase } from '@/integrations/supabase/client';
import { useLogger } from '@/hooks/useLogger';
import { API_ENDPOINTS } from '@/constants';

export interface PaymentParams { bookingId: string; hostStripeAccountId: string; }

export function useBookingPayment() {
  const { debug, error: logError } = useLogger({ context: 'useBookingPayment' });

  const initializePayment = async (params: PaymentParams) => {
    debug('Initializing payment flow', params);
    const { bookingId, hostStripeAccountId } = params;

    if (!hostStripeAccountId) {
        throw new Error('Host Stripe account ID is missing');
    }

    // Call the Edge Function
    const { data: sessionData, error: fnError } = await supabase.functions.invoke(
      API_ENDPOINTS.CREATE_CHECKOUT,
      { body: { booking_id: bookingId, origin: window.location.origin } }
    );

    // Handle Edge Function invocation errors (e.g., 500, network error)
    if (fnError) {
      logError('Payment Function Invocation Error', fnError);
      throw new Error(`Payment initialization failed: ${fnError.message}`);
    }

    // Validate response data
    if (!sessionData) {
        logError('Payment Function returned empty data');
        throw new Error('Payment initialization failed: No response data');
    }

    if (!sessionData.url) {
      logError('No payment URL in response', { sessionData });
      throw new Error('Payment session created but no URL returned');
    }

    debug('Payment session created successfully', { url: sessionData.url });
    return sessionData.url;
  };

  return { initializePayment };
}
