import { supabase } from "@/integrations/supabase/client";
import { SlotReservationResult } from "@/types/booking";
import { createPaymentSession } from "@/lib/payment-utils";
import { toast } from "sonner";

// Type guard per validare SlotReservationResult
function isSlotReservationResult(data: any): data is SlotReservationResult {
  return (
    typeof data === 'object' &&
    data !== null &&
    typeof data.success === 'boolean' &&
    (data.error === undefined || typeof data.error === 'string') &&
    (data.booking_id === undefined || typeof data.booking_id === 'string') &&
    (data.reservation_token === undefined || typeof data.reservation_token === 'string') &&
    (data.reserved_until === undefined || typeof data.reserved_until === 'string') &&
    (data.space_title === undefined || typeof data.space_title === 'string') &&
    (data.confirmation_type === undefined || typeof data.confirmation_type === 'string')
  );
}

export const reserveBookingSlot = async (
  spaceId: string,
  date: string,
  startTime: string,
  endTime: string,
  confirmationType: string
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
  amount: number,
  onSuccess: () => void,
  onError: (message: string) => void
) => {
  try {
    console.log('🔵 handlePaymentFlow - Starting payment flow:', {
      bookingId,
      amount
    });
    
    const paymentSession = await createPaymentSession(bookingId, amount);
    
    if (!paymentSession) {
      console.error('🔴 handlePaymentFlow - Failed to create payment session');
      onError("Errore nella creazione della sessione di pagamento");
      return;
    }

    console.log('🔵 handlePaymentFlow - Payment session created:', {
      sessionId: paymentSession.session_id,
      paymentUrl: paymentSession.payment_url
    });
    
    // Store session ID in booking for tracking
    const { error: updateError } = await supabase
      .from('bookings')
      .update({ payment_session_id: paymentSession.session_id })
      .eq('id', bookingId);

    if (updateError) {
      console.warn('⚠️ handlePaymentFlow - Failed to update booking with session ID:', updateError);
    }

    console.log('🔵 handlePaymentFlow - Redirecting to Stripe:', paymentSession.payment_url);
    
    // Redirect to Stripe Checkout
    window.location.href = paymentSession.payment_url;
    
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
