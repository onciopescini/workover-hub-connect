import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export const useConfirmInvoiceIssued = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (paymentId: string) => {
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
        title: 'Fattura Confermata',
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
