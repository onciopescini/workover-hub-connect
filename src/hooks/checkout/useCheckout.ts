import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useLogger } from '@/hooks/useLogger';
import { format } from 'date-fns';
import { createBookingDateTime } from '@/lib/date-time';
import type { CoworkerFiscalData } from '@/types/booking';

export interface CheckoutParams {
  spaceId: string;
  userId: string;
  date: Date;
  startTime: string;
  endTime: string;
  guestsCount: number;
  confirmationType: 'instant' | 'host_approval';
  pricePerHour: number;
  pricePerDay: number;
  durationHours: number;
  hostStripeAccountId?: string;
  fiscalData?: CoworkerFiscalData | null;
  clientBasePrice?: number;
}

export interface CheckoutResult {
  success: boolean;
  bookingId?: string;
  error?: string;
  errorCode?: string; // Add specific error code support
}

export interface UseCheckoutResult {
  processCheckout: (params: CheckoutParams) => Promise<CheckoutResult>;
  isLoading: boolean;
}

export function useCheckout(): UseCheckoutResult {
  const [isLoading, setIsLoading] = useState(false);
  const { debug, error: logError } = useLogger({ context: 'useCheckout' });

  const processCheckout = async (params: CheckoutParams): Promise<CheckoutResult> => {
    setIsLoading(true);
    const {
      spaceId,
      userId,
      date,
      startTime,
      endTime,
      guestsCount,
      confirmationType,
      clientBasePrice
    } = params;

    const dateStr = format(date, 'yyyy-MM-dd');

    try {
      // 1. Prepare Parameters for RPC
      // Calculate ISO timestamps for database (TIMESTAMPTZ)
      const startIso = createBookingDateTime(dateStr, startTime).toISOString();
      const endIso = createBookingDateTime(dateStr, endTime).toISOString();

      const rpcParams = {
        p_space_id: spaceId,
        p_user_id: userId,
        p_start_time: startIso,
        p_end_time: endIso,
        p_guests_count: guestsCount,
        p_confirmation_type: confirmationType,
        p_client_base_price: clientBasePrice ?? 0
      };

      debug('Calling validate_and_reserve_slot', rpcParams);

      // 2. Create Booking (RPC) -> returns bookingId
      // The RPC handles validation, collision checks, and insertion.
      const { data: rpcData, error: rpcError } = await supabase.rpc('validate_and_reserve_slot', rpcParams);

      if (rpcError) {
        logError('RPC Error', rpcError);
        // Map common errors if possible
        if (rpcError.code === '23P01' || rpcError.message?.includes('overlap')) {
             return { success: false, error: "Slot already booked", errorCode: 'CONFLICT' };
        }
        throw new Error(`Booking creation failed: ${rpcError.message}`);
      }

      // 3. Extract Booking ID
      // The RPC returns JSON. We expect { booking_id: "...", status: "..." }
      const result = rpcData as { booking_id: string; status: string } | null;

      if (!result?.booking_id) {
         logError('RPC returned invalid data', undefined, { rpcData });
         throw new Error("Booking creation succeeded but returned no ID");
      }

      const bookingId = result.booking_id;

      // 4. Call Edge Function for Payment Session
      // Now required for BOTH Instant and Request types
      debug('Invoking create-checkout-v3', { bookingId });

      const { data: checkoutData, error: checkoutError } = await supabase.functions.invoke('create-checkout-v3', {
        body: {
          booking_id: bookingId,
          return_url: `${window.location.origin}/messages` // User goes to chat after paying
        }
      });

      if (checkoutError) {
        logError('Checkout Function Error', checkoutError);
        throw checkoutError;
      }

      if (!checkoutData?.url) {
        throw new Error("No checkout URL returned from payment service");
      }

      // 5. Redirect to Stripe
      debug('Redirecting to Stripe', { url: checkoutData.url });
      window.location.href = checkoutData.url;

      return { success: true, bookingId }; // Browser redirects

    } catch (err) {
      const caughtError = err instanceof Error ? err : new Error('Unknown error occurred');
      logError('Checkout Flow Failed', caughtError);
      return {
        success: false,
        error: caughtError.message,
        errorCode: 'UNKNOWN'
      };
    } finally {
      setIsLoading(false);
    }
  };

  return {
    processCheckout,
    isLoading
  };
}
