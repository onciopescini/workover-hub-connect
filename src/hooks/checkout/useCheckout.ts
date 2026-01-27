import { useState } from 'react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { createBookingDateTime } from '@/lib/date-time';
import { reserveSlot, createCheckoutSession } from '@/services/api/bookingService';
import { sreLogger } from '@/lib/sre-logger';
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

      sreLogger.debug('Starting checkout flow', { component: 'useCheckout', spaceId, startIso, endIso });

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
        const errorMessage = reservation.error || 'Reservation failed';
        sreLogger.error('Reservation failed', { component: 'useCheckout', spaceId, error: errorMessage });
        toast.error(`Prenotazione fallita: ${errorMessage}`);
        return {
          success: false,
          error: errorMessage,
          errorCode: reservation.errorCode || 'RESERVE_FAILED'
        };
      }

      sreLogger.debug('Reserved slot', { component: 'useCheckout', bookingId: reservation.bookingId });

      // 3. Create checkout session via service
      sreLogger.debug('Invoking create-checkout-v3', { component: 'useCheckout', bookingId: reservation.bookingId });

      const checkout = await createCheckoutSession(reservation.bookingId!);

      if (!checkout.success || !checkout.url) {
        const errorMessage = checkout.error || 'No checkout URL';
        sreLogger.error('Checkout failed', { component: 'useCheckout', bookingId: reservation.bookingId, error: errorMessage });
        toast.error(`Pagamento fallito: ${errorMessage}`);
        return {
          success: false,
          error: errorMessage,
          errorCode: checkout.errorCode || 'CHECKOUT_FAILED'
        };
      }

      // 4. Redirect to Stripe
      sreLogger.info('Checkout success, redirecting to Stripe', { component: 'useCheckout', url: checkout.url });
      toast.success("Prenotazione confermata! Reindirizzamento a Stripe...");
      window.location.href = checkout.url;

      return { success: true, bookingId: reservation.bookingId || '' };

    } catch (err) {
      const caughtError = err instanceof Error ? err : new Error('Unknown error occurred');
      sreLogger.error('Checkout flow critical failure', { component: 'useCheckout', spaceId }, caughtError);
      toast.error(`Errore imprevisto: ${caughtError.message}`);
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
