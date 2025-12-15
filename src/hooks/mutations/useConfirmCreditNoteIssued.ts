import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useFiscalMode } from '@/contexts/FiscalModeContext';
import { useRLSErrorHandler } from '@/hooks/useRLSErrorHandler';

export const useConfirmCreditNoteIssued = () => {
  const queryClient = useQueryClient();
  const { isMockMode } = useFiscalMode();
  const { handleError } = useRLSErrorHandler();
  
  return useMutation({
    mutationFn: async (paymentId: string) => {
      if (isMockMode) {
        if (import.meta.env.DEV) {
          console.log('[FISCAL MOCK] useConfirmCreditNoteIssued simulating success for payment:', paymentId);
        }
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 500));
        return;
      }
      
      const { error } = await supabase
        .from('payments')
        .update({
          credit_note_issued_by_host: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', paymentId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['host-pending-credit-notes'] });
      queryClient.invalidateQueries({ queryKey: ['host-invoice-history'] });
      toast({
        title: isMockMode ? '🧪 [MOCK] Nota di Credito Confermata' : 'Nota di Credito Confermata',
        description: 'La nota di credito è stata registrata. Il refund verrà elaborato per il coworker.',
      });
    },
    onError: (error: any) => {
      // Try RLS error handler first
      if (!handleError(error)) {
        // Fallback to generic error
        toast({
          title: 'Errore',
          description: error.message || 'Impossibile confermare la nota di credito',
          variant: 'destructive'
        });
      }
    }
  });
};
