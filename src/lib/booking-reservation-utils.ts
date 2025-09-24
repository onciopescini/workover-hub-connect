
import { supabase } from "@/integrations/supabase/client";
import { SlotReservationResult } from "@/types/booking";
import { createPaymentSession } from "@/lib/payment-utils";
import { toast } from "sonner";

// Type guard per validare SlotReservationResult
function isSlotReservationResult(data: unknown): data is SlotReservationResult {
  if (typeof data !== 'object' || data === null) return false;
  
  const obj = data as any;
  return (
    'success' in obj &&
    typeof obj.success === 'boolean' &&
    (!('error' in obj) || obj.error === undefined || typeof obj.error === 'string') &&
    (!('booking_id' in obj) || obj.booking_id === undefined || typeof obj.booking_id === 'string') &&
    (!('reservation_token' in obj) || obj.reservation_token === undefined || typeof obj.reservation_token === 'string') &&
    (!('reserved_until' in obj) || obj.reserved_until === undefined || typeof obj.reserved_until === 'string') &&
    (!('space_title' in obj) || obj.space_title === undefined || typeof obj.space_title === 'string') &&
    (!('confirmation_type' in obj) || obj.confirmation_type === undefined || typeof obj.confirmation_type === 'string')
  );
}

export const reserveBookingSlot = async (
  spaceId: string,
  date: string,
  startTime: string,
  endTime: string,
  confirmationType: string = 'instant',
  bufferMinutes: number = 0,
  slotInterval: number = 30
): Promise<SlotReservationResult | null> => {
  try {
    console.log('🔵 reserveBookingSlot - Starting reservation:', {
      spaceId,
      date,
      startTime,
      endTime,
      confirmationType
    });

    const { data: user } = await supabase.auth.getUser();
    if (!user?.user) {
      console.error('🔴 reserveBookingSlot - User not authenticated');
      toast.error("Devi essere autenticato per prenotare");
      return null;
    }

    console.log('🔵 reserveBookingSlot - Calling validate_and_reserve_slot RPC');

    const { data, error } = await supabase.rpc('validate_and_reserve_slot', {
      space_id_param: spaceId,
      date_param: date,
      start_time_param: startTime,
      end_time_param: endTime,
      user_id_param: user.user.id,
      confirmation_type_param: confirmationType
    });

    if (error) {
      console.error('🔴 reserveBookingSlot - RPC error:', error);
      
      // Provide more specific error messages
      let errorMessage = "Errore nella prenotazione dello slot";
      if (error.message?.includes('not available')) {
        errorMessage = "Lo spazio non è disponibile o l'host non ha collegato Stripe";
      } else if (error.message?.includes('not available')) {
        errorMessage = "L'orario selezionato non è disponibile";
      } else if (error.message?.includes('conflict')) {
        errorMessage = "C'è un conflitto con un'altra prenotazione";
      }
      
      toast.error(errorMessage);
      return null;
    }

    console.log('🔵 reserveBookingSlot - RPC response:', data);

    // Valida la struttura della risposta con il type guard
    if (!isSlotReservationResult(data)) {
      console.error('🔴 reserveBookingSlot - Invalid response structure:', data);
      toast.error("Errore nel formato della risposta del server");
      return null;
    }

    if (!data.success) {
      console.error('🔴 reserveBookingSlot - Reservation failed:', data.error);
      toast.error(data.error || "Errore nella prenotazione");
      return null;
    }

    console.log('✅ reserveBookingSlot - Reservation successful:', data);
    return data;

  } catch (error) {
    console.error('🔴 reserveBookingSlot - Unexpected error:', error);
    toast.error("Errore imprevisto nella prenotazione");
    return null;
  }
};

export const calculateBookingTotal = (pricePerDay: number, startTime: string, endTime: string): number => {
  try {
    const start = new Date(`2000-01-01T${startTime}`);
    const end = new Date(`2000-01-01T${endTime}`);
    const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    
    // Assuming 8-hour workday for daily pricing
    const total = Math.round((hours * (pricePerDay / 8)) * 100) / 100;
    
    console.log('🔵 calculateBookingTotal:', {
      pricePerDay,
      startTime,
      endTime,
      hours,
      total
    });
    
    return total;
  } catch (error) {
    console.error('🔴 calculateBookingTotal - Error:', error);
    return 0;
  }
};

export const handlePaymentFlow = async (
  bookingId: string,
  spaceId: string,
  durationHours: number,
  pricePerHour: number,
  pricePerDay: number,
  hostStripeAccountId: string,
  onSuccess: () => void,
  onError: (message: string) => void
) => {
  try {
    // Guard: check if host has Stripe account
    if (!hostStripeAccountId) {
      console.error('🔴 handlePaymentFlow - Host not connected to Stripe');
      toast.error('Host non collegato a Stripe', {
        description: 'Impossibile procedere con il pagamento. Contatta il proprietario dello spazio.',
      });
      onError('HOST_STRIPE_ACCOUNT_MISSING');
      return;
    }

    console.log('🔵 handlePaymentFlow payload', {
      bookingId, spaceId, durationHours, pricePerHour, pricePerDay,
      host_stripe_account_id: hostStripeAccountId
    });
    
    const paymentSession = await createPaymentSession(
      bookingId, 
      spaceId, 
      durationHours, 
      pricePerHour, 
      pricePerDay, 
      hostStripeAccountId
    );
    
    if (!paymentSession) {
      console.error('🔴 handlePaymentFlow - Failed to create payment session');
      onError("Errore nella creazione della sessione di pagamento");
      return;
    }

    console.log('🔵 handlePaymentFlow - Payment session created:', {
      sessionId: paymentSession.session_id,
      paymentUrl: paymentSession.url
    });
    
    // Store session ID in booking for tracking
    const { error: updateError } = await supabase
      .from('bookings')
      .update({ payment_session_id: paymentSession.session_id })
      .eq('id', bookingId);

    if (updateError) {
      console.warn('⚠️ handlePaymentFlow - Failed to update booking with session ID:', updateError);
    }

    console.log('🔵 handlePaymentFlow - Redirecting to Stripe:', paymentSession.url);
    
    // Redirect to Stripe Checkout
    window.location.href = paymentSession.url;
    
  } catch (error) {
    console.error('🔴 handlePaymentFlow - Error:', error);
    onError("Errore nel flusso di pagamento");
  }
};

export const getSpacesWithConnectedHosts = async () => {
  try {
    const { data, error } = await supabase
      .from('spaces')
      .select(`
        *,
        profiles!spaces_host_id_fkey (
          stripe_connected,
          first_name,
          last_name
        )
      `)
      .eq('published', true)
      .eq('is_suspended', false)
      .eq('profiles.stripe_connected', true);

    if (error) {
      console.error('Error fetching spaces with connected hosts:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Unexpected error fetching spaces:', error);
    return [];
  }
};
