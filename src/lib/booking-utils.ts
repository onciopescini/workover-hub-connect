import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { API_ENDPOINTS } from "@/constants";
import { sreLogger } from '@/lib/sre-logger';
import { calculateRefund } from '@/lib/policy-calculator';

// Re-export for backward compatibility, but strictly use PolicyCalculator under the hood
export const calculateCancellationFee = (
  bookingDate: string,
  pricePerDay: number,
  startTime?: string
): { fee: number; percentage: string; description: string } => {
  // Construct a date object
  let bookingStart: Date;
  try {
    const dateTimeStr = startTime ? `${bookingDate}T${startTime}` : bookingDate;
    bookingStart = new Date(dateTimeStr);
  } catch (e) {
    bookingStart = new Date(bookingDate);
  }

  // Use the standard calculator
  // Note: We default to 'moderate' as the policy isn't passed here in the legacy signature.
  // Ideally, consumers should pass the policy.
  const result = calculateRefund(pricePerDay, 'moderate', bookingStart, new Date());

  // Map result back to legacy structure
  return {
    fee: result.penaltyAmount,
    percentage: `${result.penaltyPercentage}%`,
    description: result.penaltyPercentage === 0
      ? "Cancellazione gratuita"
      : `Penale del ${result.penaltyPercentage}%`
  };
};

// Cancel booking function
export const cancelBooking = async (
  bookingId: string, 
  cancelledByHost: boolean = false, 
  reason?: string
): Promise<{ success: boolean; fee?: number; error?: string }> => {
  try {
    const { data, error } = await supabase.functions.invoke(API_ENDPOINTS.CANCEL_BOOKING, {
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
