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
      // It throws a hard error on failure, and returns JSON on success.
      const { data: rpcData, error: rpcError } = await supabase.rpc('validate_and_reserve_slot', rpcParams);

      if (rpcError) {
        logError('RPC Error', rpcError);
        // Map common errors if possible
        if (rpcError.code === '23P01' || rpcError.message?.includes('overlap')) {
             return { success: false, error: "Slot already booked", errorCode: 'CONFLICT' };
        }
        throw new Error(`Booking creation failed: ${rpcError.message}`);
      }

      if (!rpcData) {
         logError('RPC returned no data', undefined, { rpcData });
         throw new Error("Reservation failed: No response from server");
      }

      // 3. Extract Booking ID
      // HANDLE JSON RESPONSE
      // The RPC returns { booking_id: "...", status: "..." }
      // We handle cases where it might return the object directly or as a property
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const dataObj = rpcData as any;
      const bookingId = dataObj.booking_id || dataObj;

      console.log("RESERVED SLOT ID:", bookingId); // Debug log

      if (typeof bookingId !== 'string') {
          console.error("Invalid Booking ID format:", rpcData);
          throw new Error("Invalid Booking ID received from server");
      }

      // 4. Call Edge Function for Payment Session
      // Now required for BOTH Instant and Request types
      const payload = {
        booking_id: bookingId,
        return_url: `${window.location.origin}/messages` // User goes to chat after paying
      };

      console.log("CHECKOUT PAYLOAD:", payload);
      debug('Invoking create-checkout-v3', { bookingId });

      const { data: checkoutData, error: checkoutError } = await supabase.functions.invoke('create-checkout-v3', {
        body: payload
      });

      if (checkoutError) {
        console.error("RAW ERROR OBJECT:", checkoutError);
        let serverMessage = checkoutError.message;

        // Attempt to extract JSON body from FunctionsHttpError (if context exists and has json method)
        // We do not assume 'context' exists or that it has .json()
        const hasJsonContext =
          checkoutError &&
          typeof checkoutError === 'object' &&
          'context' in checkoutError &&
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (checkoutError as any).context &&
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          typeof (checkoutError as any).context.json === 'function';

        if (hasJsonContext) {
          try {
             // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const errorBody = await (checkoutError as any).context.json();
            console.error("SERVER ERROR DETAILS:", errorBody);

            // Extract meaningful message from body
            if (errorBody?.error) {
              serverMessage = errorBody.error;
            } else if (errorBody?.message) {
              serverMessage = errorBody.message;
            }
          } catch (parseErr) {
            console.error("Failed to parse error response body", parseErr);
          }
        } else if (checkoutError instanceof Error) {
            console.error("ERROR MESSAGE:", checkoutError.message);
            console.error("ERROR STACK:", checkoutError.stack);
        }

        logError('Checkout Function Error', checkoutError);
        throw new Error(serverMessage);
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
      console.error("CRITICAL FAILURE:", caughtError.message);
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
