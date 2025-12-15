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

    // Explicitly Log start
    if (import.meta.env.DEV) {
      console.log('DEBUG: processCheckout started', { spaceId, userId, dateStr, confirmationType });
    }

    try {
      // 1. Validate Availability via RPC
      if (import.meta.env.DEV) {
        console.log('DEBUG: Step 1 - Validating availability...');
      }
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
        console.error('DEBUG: Validation RPC Error', validationResult.error);
        throw new Error(`Validation failed: ${validationResult.error.message}`);
      }

      const validationData = validationResult.data as { success?: boolean; error?: string };
      if (validationData && validationData.success === false) {
         console.error('DEBUG: Validation Data Error', validationData);
         throw new Error(validationData.error || 'Slot validation returned false');
      }
      if (import.meta.env.DEV) {
        console.log('DEBUG: Validation successful');
      }

      // 2. Prepare Payload
      if (import.meta.env.DEV) {
        console.log('DEBUG: Step 2 - Preparing insert payload...');
      }
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
      };

      // 3. Insert Booking
      if (import.meta.env.DEV) {
        console.log('DEBUG: Step 3 - Inserting booking...', bookingInsertData);
      }

      const { data: bookingData, error: insertError } = await supabase
        .from('bookings')
        .insert(bookingInsertData)
        .select('id')
        .single();

      // Handle Insert Error: If the insert returns an error, STOP execution and show a toast error.
      if (insertError) {
        console.error('DEBUG: Insert Error', insertError);
        throw new Error(`Insert failed: ${insertError.message} (Code: ${insertError.code})`);
      }

      if (!bookingData?.id) {
        console.error('DEBUG: Insert returned no ID', bookingData);
        throw new Error('Database insert succeeded but returned no ID');
      }

      const bookingId = bookingData.id;
      if (import.meta.env.DEV) {
        console.log('DEBUG: Insert Success. Booking ID:', bookingId);
      }

      // 4. Payment (ONLY if insert is successful)
      if (isInstant) {
        if (!hostStripeAccountId) {
           throw new Error('Host Stripe account ID is missing for instant booking');
        }

        if (import.meta.env.DEV) {
          console.log('DEBUG: Step 4 - Calling create-checkout-v3...');
        }

        const { data: sessionData, error: fnError } = await supabase.functions.invoke(
          'create-checkout-v3',
          {
            body: {
              booking_id: bookingId,
              origin: window.location.origin
            }
          }
        );

        if (fnError) {
           console.error('DEBUG: Payment Function Error', fnError);
           throw new Error(`Payment initialization failed: ${fnError.message}`);
        }

        if (!sessionData?.url) {
           console.error('DEBUG: No payment URL', sessionData);
           throw new Error('Payment session created but no URL returned');
        }

        if (import.meta.env.DEV) {
          console.log('DEBUG: Payment URL received. Redirecting...', sessionData.url);
        }
        window.location.href = sessionData.url;
        return { success: true, bookingId }; // Browser redirects
      }

      // Non-instant (Request)
      if (import.meta.env.DEV) {
        console.log('DEBUG: Request flow completed');
      }
      return { success: true, bookingId };

    } catch (err: any) {
      console.error('DEBUG: Checkout Flow Failed', err);
      // Ensure specific message is propagated
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
