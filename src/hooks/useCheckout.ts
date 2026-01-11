import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useLogger } from '@/hooks/useLogger';
import { toast } from 'sonner';
import { addHours, format } from 'date-fns';
import { BookingInsert } from '@/types/booking';
import { API_ENDPOINTS } from '@/constants';
import { useNavigate } from 'react-router-dom';

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
  const navigate = useNavigate();

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
        fiscal_data: fiscalData // Persist fiscal data
      };

      // 3. Insert Booking
      const { data: bookingData, error: insertError } = await supabase
        .from('bookings')
        .insert(bookingInsertData)
        .select('id')
        .single();

      // Handle Insert Error: If the insert returns an error, STOP execution and show a toast error.
      if (insertError) {
        console.error('DEBUG: Insert Error', insertError);
        // Specifically handle Foreign Key Violation (Space not found)
        if (insertError.code === '23503') {
           toast.error("This space is no longer available or has been removed by the host.");
           navigate('/');
           return { success: false, error: "Space not found" };
        }
        throw new Error(`Insert failed: ${insertError.message} (Code: ${insertError.code})`);
      }

      if (!bookingData?.id) {
        console.error('DEBUG: Insert returned no ID', bookingData);
        throw new Error('Database insert succeeded but returned no ID');
      }

      const bookingId = bookingData.id;

      // 4. Payment (Now required for BOTH Instant and Request types)
      // Instant -> Capture Automatic
      // Request -> Capture Manual (Auth Only)
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
          console.error('DEBUG: Payment Function Error', fnError);
          throw new Error(`Payment initialization failed: ${fnError.message}`);
      }

      if (!sessionData?.url) {
          console.error('DEBUG: No payment URL', sessionData);
          throw new Error('Payment session created but no URL returned');
      }

      window.location.href = sessionData.url;
      return { success: true, bookingId }; // Browser redirects

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
