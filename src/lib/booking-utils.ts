
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CancelBookingResponse } from "@/types/booking";
import { sreLogger } from '@/lib/sre-logger';

// Calculate cancellation fee based on booking date
export const calculateCancellationFee = (bookingDate: string, pricePerDay: number): { fee: number; percentage: string; description: string } => {
  const today = new Date();
  const booking = new Date(bookingDate);
  
  // Reset time to compare only dates
  today.setHours(0, 0, 0, 0);
  booking.setHours(0, 0, 0, 0);
  
  const daysUntilBooking = Math.ceil((booking.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  
  if (daysUntilBooking < 0) {
    return {
      fee: pricePerDay,
      percentage: "100%",
      description: "Prenotazione già iniziata - nessun rimborso"
    };
  } else if (daysUntilBooking === 0) {
    return {
      fee: pricePerDay * 0.5,
      percentage: "50%",
      description: "Cancellazione nel giorno stesso"
    };
  } else {
    return {
      fee: 0,
      percentage: "0%",
      description: "Cancellazione gratuita"
    };
  }
};

// Cancel booking function
export const cancelBooking = async (
  bookingId: string, 
  cancelledByHost: boolean = false, 
  reason?: string
): Promise<{ success: boolean; fee?: number; error?: string }> => {
  try {
    const { data, error } = await supabase.functions.invoke('cancel-booking', {
      body: {
        booking_id: bookingId,
        cancelled_by_host: cancelledByHost,
        reason: reason
      }
    });

    if (error) {
      sreLogger.error('Error cancelling booking', { bookingId, cancelledByHost }, error as Error);
      const errorMessage = error.message || "Errore nella cancellazione della prenotazione";
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    }

    // In the edge function response, we expect success: true
    if (!data?.success) {
       const errorMessage = data?.error || "Errore sconosciuto nella cancellazione";
       toast.error(errorMessage);
       return { success: false, error: errorMessage };
    }

    toast.success(data.message || "Prenotazione cancellata con successo");
    return { 
      success: true, 
      fee: data.cancellation_fee || 0
    };
  } catch (error: any) {
    sreLogger.error('Error cancelling booking', { bookingId, cancelledByHost }, error as Error);
    toast.error("Errore nella cancellazione della prenotazione");
    return { success: false, error: "Errore di rete" };
  }
};
