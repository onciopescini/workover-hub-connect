import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useLogger } from '@/hooks/useLogger';
import { toast } from 'sonner';
import { addHours, format } from 'date-fns';
import { BookingInsert } from '@/types/booking';
import { useNavigate } from 'react-router-dom';
import { useBookingValidation } from './checkout/useBookingValidation';
import { useBookingPayment } from './checkout/useBookingPayment';

// Re-export types for backward compatibility
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
  fiscalData?: any;
  clientBasePrice?: number;
}

export interface CheckoutResult {
  success: boolean;
  bookingId?: string;
  error?: string;
}

export function useCheckout() {
  const [isLoading, setIsLoading] = useState(false);
  const { error: logError } = useLogger({ context: 'useCheckout' });
  const navigate = useNavigate();

  // SRP Hooks
  const { validateBooking } = useBookingValidation();
  const { initializePayment } = useBookingPayment();

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
      hostStripeAccountId,
      fiscalData
    } = params;

    const dateStr = format(date, 'yyyy-MM-dd');

    try {
      // 1. Validate Availability
      await validateBooking({
        spaceId,
        userId,
        date,
        startTime,
        endTime,
        guestsCount,
        confirmationType,
        clientBasePrice: params.clientBasePrice
      });

      // 2. Prepare Payload (Business Rules)
      const isInstant = confirmationType === 'instant';
      const now = new Date();

      let reservationDeadline: Date;
      let approvalDeadline: Date | null = null;

      if (isInstant) {
        reservationDeadline = addHours(now, 2);
      } else {
        reservationDeadline = addHours(now, 24);
        approvalDeadline = addHours(now, 24);
      }

      const bookingInsertData: BookingInsert = {
        space_id: spaceId,
        user_id: userId,
        booking_date: dateStr,
        start_time: startTime,
        end_time: endTime,
        guests_count: guestsCount,
        status: isInstant ? 'pending_payment' : 'pending_approval',
        payment_required: isInstant,
        slot_reserved_until: reservationDeadline.toISOString(),
        approval_deadline: approvalDeadline ? approvalDeadline.toISOString() : null,
        fiscal_data: fiscalData
      };

      // 3. Insert Booking (The Bridge)
      const { data: bookingData, error: insertError } = await supabase
        .from('bookings')
        .insert(bookingInsertData)
        .select('id')
        .single();

      if (insertError) {
        logError('Insert Error', insertError);
        // Specifically handle Foreign Key Violation
        if (insertError.code === '23503') {
           toast.error("This space is no longer available or has been removed by the host.");
           navigate('/');
           return { success: false, error: "Space not found" };
        }
        throw new Error(`Insert failed: ${insertError.message} (Code: ${insertError.code})`);
      }

      if (!bookingData?.id) {
        throw new Error('Database insert succeeded but returned no ID');
      }

      const bookingId = bookingData.id;

      // 4. Payment
      if (!hostStripeAccountId) {
          throw new Error('Host Stripe account ID is missing');
      }

      const { url } = await initializePayment(bookingId);

      // Redirect
      window.location.href = url;
      return { success: true, bookingId };

    } catch (err: any) {
      logError('Checkout Flow Failed', err);
      const message = err instanceof Error ? err.message : 'Unknown error occurred';
      return {
        success: false,
        error: message
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
