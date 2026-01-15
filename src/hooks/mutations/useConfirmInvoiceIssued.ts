import { toast } from "sonner";
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useFiscalMode } from '@/contexts/FiscalModeContext';
import { useRLSErrorHandler } from '@/hooks/useRLSErrorHandler';

export const useConfirmInvoiceIssued = () => {
  const queryClient = useQueryClient();
  const { isMockMode } = useFiscalMode();
  const { handleError } = useRLSErrorHandler();
  
  return useMutation({
    mutationFn: async (paymentId: string) => {
      if (isMockMode) {
        if (import.meta.env.DEV) {
          console.log('[FISCAL MOCK] useConfirmInvoiceIssued simulating success for payment:', paymentId);
        }
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
      toast.success(isMockMode, { description: "La fattura è stata registrata. Il payout verrà elaborato a breve." });
    },
    onError: (error: any) => {
      // Try RLS error handler first
      if (!handleError(error)) {
        // Fallback to generic error
        toast.error("Errore", { description: error.message });
      }
    }
  });
};
