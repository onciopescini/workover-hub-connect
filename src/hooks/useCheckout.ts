import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useLogger } from '@/hooks/useLogger';
import { toast } from 'sonner';
import { addHours, format } from 'date-fns';
import { BookingInsert } from '@/types/booking';

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
  const { info, error, debug } = useLogger({ context: 'useCheckout' });

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
      info('Starting checkout process', { spaceId, date: dateStr, confirmationType });

      // Step 1: Validate availability via RPC
      // We perform validation but we DO NOT rely on the RPC to insert the booking anymore
      // or at least we treat it as just validation.
      const validationResult = await supabase.rpc('validate_and_reserve_slot', {
        space_id_param: spaceId,
        date_param: dateStr,
        start_time_param: startTime,
        end_time_param: endTime,
        user_id_param: userId,
        guests_count_param: guestsCount,
        confirmation_type_param: confirmationType,
        client_base_price_param: params.clientBasePrice
      } as any);

      if (validationResult.error) {
         // RPC might throw or return { success: false, error: ... }
         // Handle Supabase error object
         throw validationResult.error;
      }

      const validationData = validationResult.data as {
        success?: boolean;
        error?: string;
        // If the RPC inserts, it returns these. We might ignore them if we force insert.
        // But to avoid double booking if the RPC *does* insert, we should check if booking_id is returned.
        // However, the user explicitly said the RPC does NOT insert.
        booking_id?: string;
      };

      if (!validationData || (validationData.success === false)) {
        throw new Error(validationData?.error || 'Validation failed');
      }

      // Step 2: Prepare Booking Data for Insertion
      // Logic replicated from previous SQL definition
      const isInstant = confirmationType === 'instant';
      const now = new Date();

      // Calculate deadlines
      let reservationDeadline: Date;
      let approvalDeadline: Date | null = null;

      if (isInstant) {
        reservationDeadline = addHours(now, 2); // 2 hours for payment
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
        // reservation_token: crypto.randomUUID(), // Let DB handle default if possible, or gen here
        slot_reserved_until: reservationDeadline.toISOString(),
        approval_deadline: approvalDeadline ? approvalDeadline.toISOString() : null,
      };

      debug('Inserting booking record', bookingInsertData);

      // Step 3: Insert Booking
      const { data: bookingData, error: insertError } = await supabase
        .from('bookings')
        .insert(bookingInsertData)
        .select('id')
        .single();

      if (insertError) {
        throw insertError;
      }

      if (!bookingData?.id) {
        throw new Error('Booking insertion succeeded but no ID returned');
      }

      const bookingId = bookingData.id;
      info('Booking inserted successfully', { bookingId });

      // Step 4: Handle Payment (if instant)
      if (isInstant) {
        if (!hostStripeAccountId) {
            throw new Error('Host Stripe account ID is missing for instant booking');
        }

        info('Creating payment session', { bookingId });

        const { data: sessionData, error: fnError } = await supabase.functions.invoke(
          'create-payment-session',
          {
            body: {
              space_id: spaceId,
              booking_id: bookingId, // Explicitly passed!
              durationHours: params.durationHours,
              pricePerHour: params.pricePerHour,
              pricePerDay: params.pricePerDay,
              guestsCount: guestsCount,
              host_stripe_account_id: hostStripeAccountId,
              fiscal_data: fiscalData,
            }
          }
        );

        if (fnError) throw fnError;
        if (!sessionData?.url) throw new Error('No payment URL returned');

        // Redirect
        window.location.href = sessionData.url;

        return { success: true, bookingId }; // Will redirect anyway
      } else {
        // Step 5: Handle Host Approval (Success, no payment yet)
        return { success: true, bookingId };
      }

    } catch (err) {
      error('Checkout failed', err as Error);
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error'
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
