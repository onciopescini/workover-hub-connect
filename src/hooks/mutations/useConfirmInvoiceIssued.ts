import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useFiscalMode } from '@/contexts/FiscalModeContext';

export const useConfirmInvoiceIssued = () => {
  const queryClient = useQueryClient();
  const { isMockMode } = useFiscalMode();
  
  return useMutation({
    mutationFn: async (paymentId: string) => {
      if (isMockMode) {
        console.log('[FISCAL MOCK] useConfirmInvoiceIssued simulating success for payment:', paymentId);
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 500));
        return;
      }
      
      const { error } = await supabase
        .from('payments')
        .update({
          host_invoice_reminder_sent: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', paymentId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['host-pending-invoices'] });
      queryClient.invalidateQueries({ queryKey: ['host-invoice-history'] });
      toast({
        title: isMockMode ? '🧪 [MOCK] Fattura Confermata' : 'Fattura Confermata',
        description: 'La fattura è stata registrata. Il payout verrà elaborato a breve.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Errore',
        description: error.message || 'Impossibile confermare la fattura',
        variant: 'destructive'
      });
    }
  });
};
