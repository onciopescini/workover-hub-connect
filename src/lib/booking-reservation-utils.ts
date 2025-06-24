
import { supabase } from "@/integrations/supabase/client";
import { SlotReservationResult } from "@/types/booking";
import { createPaymentSession } from "@/lib/payment-utils";
import { toast } from "sonner";

export const reserveBookingSlot = async (
  spaceId: string,
  date: string,
  startTime: string,
  endTime: string,
  confirmationType: string
): Promise<SlotReservationResult | null> => {
  try {
    const { data: user } = await supabase.auth.getUser();
    if (!user?.user) {
      toast.error("Devi essere autenticato per prenotare");
      return null;
    }

    const { data, error } = await supabase.rpc('validate_and_reserve_slot', {
      space_id_param: spaceId,
      date_param: date,
      start_time_param: startTime,
      end_time_param: endTime,
      user_id_param: user.user.id,
      confirmation_type_param: confirmationType
    });

    if (error) {
      console.error('Error reserving slot:', error);
      toast.error("Errore nella prenotazione dello slot");
      return null;
    }

    return data as SlotReservationResult;
  } catch (error) {
    console.error('Unexpected error reserving slot:', error);
    toast.error("Errore imprevisto nella prenotazione");
    return null;
  }
};

export const calculateBookingTotal = (pricePerDay: number, startTime: string, endTime: string): number => {
  const start = new Date(`2000-01-01T${startTime}`);
  const end = new Date(`2000-01-01T${endTime}`);
  const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
  return Math.round((hours * (pricePerDay / 8)) * 100) / 100; // Assuming 8-hour workday
};

export const handlePaymentFlow = async (
  bookingId: string,
  amount: number,
  onSuccess: () => void,
  onError: (message: string) => void
) => {
  try {
    console.log('🔵 Starting payment flow for booking:', bookingId, 'amount:', amount);
    
    const paymentSession = await createPaymentSession(bookingId, amount);
    
    if (!paymentSession) {
      onError("Errore nella creazione della sessione di pagamento");
      return;
    }

    console.log('🔵 Payment session created, redirecting to:', paymentSession.payment_url);
    
    // Store session ID in booking for tracking
    await supabase
      .from('bookings')
      .update({ payment_session_id: paymentSession.session_id })
      .eq('id', bookingId);

    // Redirect to Stripe Checkout
    window.location.href = paymentSession.payment_url;
    
  } catch (error) {
    console.error('Error in payment flow:', error);
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
