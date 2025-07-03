
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { validatePayment } from '@/lib/payment-utils';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

interface PaymentVerificationResult {
  isLoading: boolean;
  isSuccess: boolean;
  error: string | null;
  bookingId: string | null;
}

export const usePaymentVerification = (sessionId: string | null): PaymentVerificationResult => {
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bookingId, setBookingId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!sessionId) return;

    const verifyPayment = async () => {
      setIsLoading(true);
      setError(null);

      try {
        console.log('🔵 Verifying payment for session:', sessionId);

        // Call the validate-payment function
        const { data, error: functionError } = await supabase.functions.invoke('validate-payment', {
          body: { session_id: sessionId }
        });

        if (functionError) {
          throw new Error(functionError.message || 'Payment verification failed');
        }

        console.log('🔵 Payment verification result:', data);

        if (data?.success) {
          setIsSuccess(true);
          setBookingId(data.booking_id);
          
          // Invalida le query delle prenotazioni per forzare il refresh
          queryClient.invalidateQueries({ queryKey: ['enhanced-bookings'] });
          queryClient.invalidateQueries({ queryKey: ['coworker-bookings'] });
          queryClient.invalidateQueries({ queryKey: ['host-bookings'] });
          
          toast.success('Pagamento completato con successo! La tua prenotazione è confermata.', {
            duration: 5000
          });

          console.log('🔵 Booking queries invalidated - UI should refresh automatically');
        } else {
          throw new Error('Payment verification failed');
        }

      } catch (err: unknown) {
        console.error('🔴 Error verifying payment:', err);
        setError(err instanceof Error ? err.message : 'Errore nella verifica del pagamento');
        toast.error('Errore nella verifica del pagamento. Contatta il supporto se il problema persiste.');
      } finally {
        setIsLoading(false);
      }
    };

    verifyPayment();
  }, [sessionId, queryClient]);

  return { isLoading, isSuccess, error, bookingId };
};
