import { useState } from 'react';
import { useLogger } from '@/hooks/useLogger';
import { format } from 'date-fns';
import { createBookingDateTime } from '@/lib/date-time';
import { reserveSlot, createCheckoutSession } from '@/services/api/bookingService';
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
  errorCode?: string;
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
      // 1. Prepare ISO timestamps
      const startIso = createBookingDateTime(dateStr, startTime).toISOString();
      const endIso = createBookingDateTime(dateStr, endTime).toISOString();

      debug('Starting checkout flow', { spaceId, startIso, endIso });

      // 2. Reserve slot via service
      const reservation = await reserveSlot({
        spaceId,
        userId,
        startTime: startIso,
        endTime: endIso,
        guests: guestsCount,
        confirmationType,
        clientBasePrice: clientBasePrice ?? 0
      });

      if (!reservation.success) {
        logError('Reservation failed', new Error(reservation.error || 'Unknown error'));
        return {
          success: false,
          error: reservation.error,
          errorCode: reservation.errorCode || 'RESERVE_FAILED'
        };
      }

      console.log("RESERVED SLOT ID:", reservation.bookingId);

      // 3. Create checkout session via service
      const payload = {
        booking_id: reservation.bookingId,
        return_url: `${window.location.origin}/messages`
      };
      console.log("CHECKOUT PAYLOAD:", payload);
      debug('Invoking create-checkout-v3', { bookingId: reservation.bookingId });

      const checkout = await createCheckoutSession(reservation.bookingId!);

      if (!checkout.success || !checkout.url) {
        logError('Checkout failed', new Error(checkout.error || 'No checkout URL'));
        return {
          success: false,
          error: checkout.error,
          errorCode: checkout.errorCode || 'CHECKOUT_FAILED'
        };
      }

      // 4. Redirect to Stripe
      debug('Redirecting to Stripe', { url: checkout.url });
      window.location.href = checkout.url;

      return { success: true, bookingId: reservation.bookingId };

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
