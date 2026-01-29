
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { validatePayment } from '@/lib/payment-utils';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { sreLogger } from '@/lib/sre-logger';

interface PaymentVerificationResult {
  isLoading: boolean;
  isSuccess: boolean;
  error: string | null;
  bookingId: string | null;
  bookingStatus: string | null;
  confirmationType: string | null;
}

export const usePaymentVerification = (sessionId: string | null): PaymentVerificationResult => {
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [bookingStatus, setBookingStatus] = useState<string | null>(null);
  const [confirmationType, setConfirmationType] = useState<string | null>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!sessionId) return;

    const verifyPayment = async () => {
      setIsLoading(true);
      setError(null);

      try {
        sreLogger.debug('Verifying payment', { sessionId });

        // Call the validate-payment function
        const { data, error: functionError } = await supabase.functions.invoke('validate-payment', {
          body: { session_id: sessionId }
        });

        if (functionError) {
          throw new Error(functionError.message || 'Payment verification failed');
        }

        sreLogger.debug('Payment verification result', { success: data?.success, bookingId: data?.booking_id });

        if (data?.success) {
          setIsSuccess(true);
          setBookingId(data.booking_id);
          setBookingStatus(data.booking_status || 'confirmed');
          setConfirmationType(data.confirmation_type || 'instant');
          
          // Invalida le query delle prenotazioni per forzare il refresh
          queryClient.invalidateQueries({ queryKey: ['enhanced-bookings'] });
          queryClient.invalidateQueries({ queryKey: ['coworker-bookings'] });
          queryClient.invalidateQueries({ queryKey: ['host-bookings'] });
          
          // Differentiate toast message based on booking type
          const isRequestToBook = data.confirmation_type === 'host_approval';
          if (isRequestToBook) {
            toast.success('Richiesta inviata! L\'host valuterà la tua prenotazione.', {
              duration: 5000
            });
          } else {
            toast.success('Pagamento completato con successo! La tua prenotazione è confermata.', {
              duration: 5000
            });
          }

          sreLogger.info('Booking queries invalidated', { 
            bookingId: data.booking_id,
            bookingStatus: data.booking_status,
            confirmationType: data.confirmation_type
          });
        } else {
          throw new Error('Payment verification failed');
        }

      } catch (err: unknown) {
        sreLogger.error('Error verifying payment', { sessionId }, err as Error);
        setError(err instanceof Error ? err.message : 'Errore nella verifica del pagamento');
        toast.error('Errore nella verifica del pagamento. Contatta il supporto se il problema persiste.');
      } finally {
        setIsLoading(false);
      }
    };

    verifyPayment();
  }, [sessionId, queryClient]);

  return { isLoading, isSuccess, error, bookingId, bookingStatus, confirmationType };
};
