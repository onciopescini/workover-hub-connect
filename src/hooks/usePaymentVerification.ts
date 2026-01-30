
import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
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
  const verificationAttempted = useRef(false);

  useEffect(() => {
    if (!sessionId || verificationAttempted.current) return;
    verificationAttempted.current = true;

    const MAX_ATTEMPTS = 5;
    const BASE_DELAY_MS = 1000;

    const verifyPaymentWithRetry = async (attempt: number = 1): Promise<void> => {
      try {
        sreLogger.debug('Verifying payment', { sessionId, attempt, maxAttempts: MAX_ATTEMPTS });

        const { data, error: functionError } = await supabase.functions.invoke('validate-payment', {
          body: { session_id: sessionId }
        });

        // Check for errors OR unsuccessful response
        if (functionError || !data?.success) {
          const errorMessage = functionError?.message || data?.error || 'Unknown error';
          
          // If we have retries left, wait and try again (webhook might still be processing)
          if (attempt < MAX_ATTEMPTS) {
            const delay = BASE_DELAY_MS * Math.pow(2, attempt - 1); // Exponential backoff: 1s, 2s, 4s, 8s
            sreLogger.debug('Retry scheduled - webhook may still be processing', { 
              attempt, 
              nextAttemptIn: delay,
              errorMessage 
            });
            await new Promise(resolve => setTimeout(resolve, delay));
            return verifyPaymentWithRetry(attempt + 1);
          }
          
          // All retries exhausted
          throw new Error(`Payment verification failed after ${MAX_ATTEMPTS} attempts: ${errorMessage}`);
        }

        // Success!
        setIsSuccess(true);
        setBookingId(data.booking_id);
        setBookingStatus(data.booking_status || 'confirmed');
        setConfirmationType(data.confirmation_type || 'instant');
        
        // Invalidate booking queries to force refresh
        queryClient.invalidateQueries({ queryKey: ['enhanced-bookings'] });
        queryClient.invalidateQueries({ queryKey: ['coworker-bookings'] });
        queryClient.invalidateQueries({ queryKey: ['host-bookings'] });
        
        // Show appropriate toast based on booking type
        const isRequestToBook = data.confirmation_type === 'host_approval';
        if (isRequestToBook) {
          toast.success('Richiesta inviata! L\'host valuterà la tua prenotazione.', { duration: 5000 });
        } else {
          toast.success('Pagamento completato con successo! La tua prenotazione è confermata.', { duration: 5000 });
        }

        sreLogger.info('Payment verification succeeded', { 
          bookingId: data.booking_id,
          bookingStatus: data.booking_status,
          confirmationType: data.confirmation_type,
          attempts: attempt
        });

      } catch (err: unknown) {
        sreLogger.error('Payment verification failed after all retries', { sessionId, attempts: MAX_ATTEMPTS }, err as Error);
        setError(err instanceof Error ? err.message : 'Errore nella verifica del pagamento');
        toast.error('Errore nella verifica del pagamento. Contatta il supporto se il problema persiste.');
      }
    };

    setIsLoading(true);
    setError(null);
    
    verifyPaymentWithRetry()
      .finally(() => setIsLoading(false));

  }, [sessionId, queryClient]);

  return { isLoading, isSuccess, error, bookingId, bookingStatus, confirmationType };
};
