import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const useApproveBooking = () => {
  const queryClient = useQueryClient();
  // Force frontend rebuild for booking approval alignment

  return useMutation({
    mutationFn: async (bookingId: string) => {
      // Use Edge Function to handle Stripe Capture + DB Update Atomically
      const { data, error } = await supabase.functions.invoke('host-approve-booking', {
        body: { booking_id: bookingId }
      });

      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);

      return data;
    },
    onSuccess: () => {
      toast.success('Prenotazione approvata e pagamento confermato');
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      queryClient.invalidateQueries({ queryKey: ['host-activities'] });
    },
    onError: (error: Error) => {
      console.error('Error approving booking:', error);
      toast.error(error.message || 'Errore durante l\'approvazione della prenotazione');
    },
  });
};

export const useRejectBooking = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ bookingId, reason }: { bookingId: string; reason: string }) => {
      // Use Edge Function to handle Stripe Release + DB Update Atomically
      const { data, error } = await supabase.functions.invoke('host-reject-booking', {
        body: {
          booking_id: bookingId,
          reason: reason || "Rifiutata dall'host"
        }
      });

      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);

      return data;
    },
    onSuccess: () => {
      toast.success('Prenotazione rifiutata e autorizzazione rilasciata');
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      queryClient.invalidateQueries({ queryKey: ['host-activities'] });
    },
    onError: (error: Error) => {
      console.error('Error rejecting booking:', error);
      toast.error(error.message || 'Errore durante il rifiuto della prenotazione');
    },
  });
};
