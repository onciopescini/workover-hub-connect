
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { validatePayment } from '@/lib/payment-utils';
import { toast } from 'sonner';

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
          toast.success('Pagamento completato con successo! La tua prenotazione è confermata.', {
            duration: 5000
          });
        } else {
          throw new Error('Payment verification failed');
        }

      } catch (err: any) {
        console.error('🔴 Error verifying payment:', err);
        setError(err.message || 'Errore nella verifica del pagamento');
        toast.error('Errore nella verifica del pagamento. Contatta il supporto se il problema persiste.');
      } finally {
        setIsLoading(false);
      }
    };

    verifyPayment();
  }, [sessionId]);

  return { isLoading, isSuccess, error, bookingId };
};
