
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CancelBookingResponse } from "@/types/booking";

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
    const { data, error } = await supabase.rpc('cancel_booking', {
      booking_id: bookingId,
      cancelled_by_host: cancelledByHost,
      reason: reason || null
    });

    if (error) {
      console.error("Error cancelling booking:", error);
      toast.error("Errore nella cancellazione della prenotazione");
      return { success: false, error: error.message };
    }

    // Safe cast through unknown first
    const result = data as unknown as CancelBookingResponse;

    // Optional validation for extra safety
    if (
      typeof result !== "object" ||
      result === null ||
      typeof result.success !== "boolean"
    ) {
      toast.error("Risposta inattesa dal server");
      return { success: false, error: "Risposta inattesa dal server" };
    }

    if (!result.success) {
      toast.error(result.error || "Errore nella cancellazione");
      return { success: false, error: result.error };
    }

    toast.success("Prenotazione cancellata con successo");
    return { 
      success: true, 
      fee: result.cancellation_fee || 0 
    };
  } catch (error) {
    console.error("Error cancelling booking:", error);
    toast.error("Errore nella cancellazione della prenotazione");
    return { success: false, error: "Errore di rete" };
  }
};
