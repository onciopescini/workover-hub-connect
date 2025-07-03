
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const useCancelBookingMutation = () => {
  const queryClient = useQueryClient();
  
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
      console.log('🔄 Cancelling booking:', bookingId);
      
      const params: any = {
        booking_id: bookingId,
        cancelled_by_host: isHost
      };
      
      if (reason) {
        params.reason = reason;
      }
      
      const { data, error } = await supabase.rpc('cancel_booking', params);

      if (error) {
        console.error('❌ Cancel booking error:', error);
        throw error;
      }

      console.log('✅ Booking cancelled successfully');
      return data;
    },
    onSuccess: () => {
      // Invalidate all booking-related queries
      queryClient.invalidateQueries({ queryKey: ['enhanced-bookings'] });
      queryClient.invalidateQueries({ queryKey: ['host-dashboard-metrics'] });
      toast.success("Prenotazione cancellata con successo");
    },
    onError: (error: unknown) => {
      console.error("❌ Error cancelling booking:", error);
      const errorMessage = error instanceof Error ? error.message : 'Errore sconosciuto';
      toast.error(`Errore nella cancellazione: ${errorMessage}`);
    },
  });
};
