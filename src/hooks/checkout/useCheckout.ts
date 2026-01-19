import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useLogger } from '@/hooks/useLogger';
import { toast } from 'sonner';
import { addHours, format } from 'date-fns';
import { BookingInsert } from '@/types/booking';
import { useNavigate } from 'react-router-dom';
import { useBookingValidation } from './useBookingValidation';
import { useBookingPayment } from './useBookingPayment';
import type { CoworkerFiscalData } from '@/types/booking';
import { PostgrestError } from '@supabase/supabase-js';

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

export function useCheckout() {
  const [isLoading, setIsLoading] = useState(false);
  const { debug, error: logError } = useLogger({ context: 'useCheckout' });
  const navigate = useNavigate();
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
      // 1. Validate Availability via RPC
      await validateBooking({
        spaceId,
        userId,
        dateStr,
        startTime,
        endTime,
        guestsCount,
        confirmationType,
        clientBasePrice: params.clientBasePrice ?? 0
      });

      // 2. Prepare Payload
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

      // STRICT SEQUENCE: Prepare payload mapping form data to bookings table schema
      // IMPORTANT: Use space_id (not workspace_id)
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
        fiscal_data: fiscalData ? (fiscalData as unknown as import('@/integrations/supabase/types').Json) : null
      };

      // 3. Insert Booking
      const { data: bookingData, error: insertError } = await supabase
        .from('bookings')
        .insert(bookingInsertData)
        .select('id')
        .single();

      // Handle Insert Error: If the insert returns an error, STOP execution.
      if (insertError) {
        logError('Insert Error', undefined, { error: insertError }); // Fixed: Pass insertError in metadata or adapt logError to accept PostgrestError if possible, but useLogger signature expects Error object.

        // Handle Exclusion Constraint Violation (23P01) - Double Booking
        if (insertError.code === '23P01') {
          return {
            success: false,
            error: "Slot already booked",
            errorCode: 'CONFLICT'
          };
        }

        // Specifically handle Foreign Key Violation (Space not found)
        if (insertError.code === '23503') {
           toast.error("This space is no longer available or has been removed by the host.");
           navigate('/');
           return { success: false, error: "Space not found", errorCode: 'SPACE_NOT_FOUND' };
        }

        throw new Error(`Insert failed: ${insertError.message} (Code: ${insertError.code})`);
      }

      if (!bookingData?.id) {
        logError('Insert returned no ID', undefined, { bookingData });
        throw new Error('Database insert succeeded but returned no ID');
      }

      const bookingId = bookingData.id;

      // 4. Payment (Now required for BOTH Instant and Request types)
      // Instant -> Capture Automatic
      // Request -> Capture Manual (Auth Only)
      if (!hostStripeAccountId) {
          throw new Error('Host Stripe account ID is missing');
      }

      const paymentUrl = await initializePayment({
        bookingId,
        hostStripeAccountId
      });

      window.location.href = paymentUrl;
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
