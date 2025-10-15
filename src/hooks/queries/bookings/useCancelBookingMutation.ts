
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
      
      const params: any = {
        booking_id: bookingId,
        cancelled_by_host: isHost
      };
      
      if (reason) {
        params.reason = reason;
      }
      
      const { data, error } = await supabase.rpc('cancel_booking', params);

      if (error) {
        sreLogger.error('Cancel booking error', { bookingId }, error);
        throw error;
      }

      logger.info('Booking cancelled successfully', { component: 'useCancelBookingMutation', action: 'cancel_success', metadata: { bookingId } });
      return data;
    },
    onSuccess: () => {
      // Invalidate all booking-related queries
      queryClient.invalidateQueries({ queryKey: ['enhanced-bookings'] });
      queryClient.invalidateQueries({ queryKey: ['host-dashboard-metrics'] });
      toast.success("Prenotazione cancellata con successo");
    },
    onError: (error: unknown) => {
      sreLogger.error("Error cancelling booking", {}, error as Error);
      
      // Try RLS error handler first
      if (!handleError(error)) {
        // Fallback to generic error
        const errorMessage = error instanceof Error ? error.message : 'Errore sconosciuto';
        toast.error(`Errore nella cancellazione: ${errorMessage}`);
      }
    },
  });
};
