
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { logger } from "@/lib/logger";
import { sreLogger } from '@/lib/sre-logger';
import { useRLSErrorHandler } from '@/hooks/useRLSErrorHandler';

export const useCancelBookingMutation = () => {
  const queryClient = useQueryClient();
  const { handleError } = useRLSErrorHandler();
  
  return useMutation({
    mutationFn: async ({ 
      bookingId, 
      isHost, 
      reason 
    }: { 
      bookingId: string; 
      isHost: boolean; 
      reason?: string;
    }) => {
      logger.info('Cancelling booking', { component: 'useCancelBookingMutation', action: 'cancel', metadata: { bookingId } });
      
      const { data, error } = await supabase.functions.invoke('cancel-booking', {
        body: {
          booking_id: bookingId,
          cancelled_by_host: isHost,
          reason: reason
        }
      });

      if (error) {
        sreLogger.error('Cancel booking error (network/function)', { bookingId }, error);
        throw error;
      }

      // Check if the function returned a logical error even with 200 OK
      if (data && !data.success && data.error) {
        const logicError = new Error(data.error);
        sreLogger.error('Cancel booking logical error', { bookingId, data }, logicError);
        throw logicError;
      }

      logger.info('Booking cancelled successfully', { component: 'useCancelBookingMutation', action: 'cancel_success', metadata: { bookingId } });
      return data;
    },
    onSuccess: () => {
      // Invalidate to ensure server state is correct and UI updates based on real data
      queryClient.invalidateQueries({ queryKey: ['enhanced-bookings'] });
      queryClient.invalidateQueries({ queryKey: ['host-dashboard-metrics'] });
      toast.success("Prenotazione cancellata con successo");
    },
    onError: (error: unknown) => {
      sreLogger.error("Error cancelling booking", {}, error as Error);
      console.error("Cancellation failed:", error);
      
      // Try RLS error handler first
      if (!handleError(error)) {
        // Fallback to generic error
        const errorMessage = error instanceof Error ? error.message : 'Errore sconosciuto';
        toast.error(`Errore nella cancellazione: ${errorMessage}`);
      }
    },
  });
};
