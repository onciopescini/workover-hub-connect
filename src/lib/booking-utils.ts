
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CancelBookingResponse } from "@/types/booking";
import { sreLogger } from '@/lib/sre-logger';
import { differenceInHours, parseISO } from "date-fns";

// Calculate cancellation fee based on booking start time relative to now (in hours)
// Policy:
// < 24h: 100% penalty
// < 48h: 50% penalty
// >= 48h: 0% penalty
export const calculateCancellationFee = (
  bookingDate: string,
  pricePerDay: number,
  startTime?: string // Optional for backward compatibility, but highly recommended for accuracy
): { fee: number; percentage: string; description: string } => {
  const now = new Date();
  
  // Construct the full booking start datetime
  // If startTime is provided, use it. Otherwise default to start of bookingDate (00:00) which is conservative.
  // Ideally, bookingDate is YYYY-MM-DD and startTime is HH:mm:ss
  
  let bookingStart: Date;
  
  try {
    if (startTime) {
      bookingStart = parseISO(`${bookingDate}T${startTime}`);
    } else {
      bookingStart = parseISO(bookingDate);
    }
  } catch (e) {
    // Fallback if parsing fails
    bookingStart = new Date(bookingDate);
  }

  // Calculate hours difference: (Booking Start - Now)
  const hoursUntilBooking = differenceInHours(bookingStart, now);

  if (hoursUntilBooking < 24) {
    return {
      fee: pricePerDay,
      percentage: "100%",
      description: "Meno di 24h all'inizio - Nessun rimborso"
    };
  } else if (hoursUntilBooking < 48) {
    return {
      fee: pricePerDay * 0.5,
      percentage: "50%",
      description: "Meno di 48h all'inizio - Rimborso del 50%"
    };
  } else {
    return {
      fee: 0,
      percentage: "0%",
      description: "Più di 48h all'inizio - Cancellazione gratuita"
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
