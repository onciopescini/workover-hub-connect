import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { queryKeys } from '@/lib/react-query-config';
import { sreLogger } from '@/lib/sre-logger';
import { isInvalidStatusTransitionError, STATUS_TRANSITION_ERROR_TOAST_MESSAGE } from '@/lib/bookings/status-transition-errors';

interface CreateBookingDisputePayload {
  bookingId: string;
  reason: string;
}

export const useCreateBookingDisputeMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ bookingId, reason }: CreateBookingDisputePayload) => {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData.user) {
        throw authError ?? new Error('Utente non autenticato');
      }

      const userId = authData.user.id;

      const { error: disputeInsertError } = await supabase.from('disputes').insert({
        booking_id: bookingId,
        opened_by: userId,
        reason,
      });

      if (disputeInsertError) {
        throw disputeInsertError;
      }

      const { error: bookingUpdateError } = await supabase
        .from('bookings')
        .update({ status: 'disputed' })
        .eq('id', bookingId)
        .eq('user_id', userId);

      if (bookingUpdateError) {
        throw bookingUpdateError;
      }
    },
    onSuccess: () => {
      toast.success('Richiesta inviata al supporto');
      queryClient.invalidateQueries({ queryKey: queryKeys.enhancedBookings.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.bookings.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.coworkerBookings.list() });
    },
    onError: (error: unknown) => {
      sreLogger.error('Error creating booking dispute', {}, error as Error);

      if (isInvalidStatusTransitionError(error)) {
        toast.error(STATUS_TRANSITION_ERROR_TOAST_MESSAGE);
        return;
      }

      const errorMessage = error instanceof Error ? error.message : 'Errore nella segnalazione del problema';
      toast.error(errorMessage);
    },
  });
};
