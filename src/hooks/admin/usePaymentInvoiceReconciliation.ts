import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { sreLogger } from '@/lib/sre-logger';
import { toast } from 'sonner';

export interface PaymentWithoutInvoice {
  id: string;
  booking_id: string;
  user_id: string;
  amount: number;
  payment_status: string;
  created_at: string;
  stripe_session_id: string | null;
  host_amount: number | null;
  platform_fee: number | null;
  booking?: {
    spaces?: {
      host_id: string;
      title: string;
    };
  };
}

export interface ReconciliationStats {
  totalPayments: number;
  paymentsWithInvoice: number;
  paymentsWithoutInvoice: number;
  totalAmount: number;
  missingInvoiceAmount: number;
}

export const usePaymentInvoiceReconciliation = () => {
  const queryClient = useQueryClient();

  // Fetch payments without invoices
  const paymentsWithoutInvoiceQuery = useQuery({
    queryKey: ['admin-payments-without-invoice'],
    queryFn: async () => {
      const { data: payments, error: paymentsError } = await supabase
        .from('payments')
        .select(`
          *,
          booking:bookings!fk_payments_booking_id (id, space_id)
        `)
        .eq('payment_status', 'completed')
        .order('created_at', { ascending: false });

      if (paymentsError) {
        sreLogger.error('Error fetching payments', { error: paymentsError });
        throw paymentsError;
      }

      // Fetch spaces separately to avoid FK relationship issues
      const spaceIds = [...new Set(payments?.map(p => p.booking?.space_id).filter((id): id is string => id !== null) || [])];
      const { data: spaces } = await supabase
        .from('spaces')
        .select('id, host_id, title')
        .in('id', spaceIds);
      
      const spacesMap = new Map(spaces?.map(s => [s.id, s]) || []);

      // Check which payments have invoices
      const paymentIds = payments?.map(p => p.id) || [];
      const { data: invoices, error: invoicesError } = await supabase
        .from('invoices')
        .select('payment_id')
        .in('payment_id', paymentIds);

      if (invoicesError) {
        sreLogger.error('Error fetching invoices', { error: invoicesError });
        throw invoicesError;
      }

      const invoicedPaymentIds = new Set(invoices?.map(i => i.payment_id) || []);
      
      const paymentsWithoutInvoice = (payments || [])
        .filter(p => !invoicedPaymentIds.has(p.id))
        .map(p => ({
          ...p,
          booking: p.booking ? {
            ...p.booking,
            spaces: p.booking.space_id ? spacesMap.get(p.booking.space_id) : undefined
          } : undefined
        }));

      return paymentsWithoutInvoice as unknown as PaymentWithoutInvoice[];
    }
  });

  // Fetch reconciliation stats
  const statsQuery = useQuery({
    queryKey: ['admin-reconciliation-stats'],
    queryFn: async () => {
      const { data: payments, error: paymentsError } = await supabase
        .from('payments')
        .select('id, amount')
        .eq('payment_status', 'completed');

      if (paymentsError) throw paymentsError;

      const totalPayments = payments?.length || 0;
      const totalAmount = payments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;

      const { data: invoices, error: invoicesError } = await supabase
        .from('invoices')
        .select('payment_id, total_amount');

      if (invoicesError) throw invoicesError;

      const paymentsWithInvoice = new Set(invoices?.map(i => i.payment_id)).size;
      const paymentsWithoutInvoice = totalPayments - paymentsWithInvoice;

      const invoicedPaymentIds = new Set(invoices?.map(i => i.payment_id) || []);
      const missingInvoiceAmount = payments
        ?.filter(p => !invoicedPaymentIds.has(p.id))
        .reduce((sum, p) => sum + Number(p.amount), 0) || 0;

      return {
        totalPayments,
        paymentsWithInvoice,
        paymentsWithoutInvoice,
        totalAmount,
        missingInvoiceAmount
      } as ReconciliationStats;
    }
  });

  // Regenerate invoice mutation
  const regenerateInvoice = useMutation({
    mutationFn: async (payment: PaymentWithoutInvoice) => {
      if (!payment.booking?.spaces?.host_id) {
        throw new Error('Host ID not found');
      }

      const hostFee = Number(payment.platform_fee || 0) / 2; // 5% of base amount
      const hostVat = hostFee * 0.22;

      const { data, error } = await supabase.functions.invoke('generate-host-invoice', {
        body: {
          payment_id: payment.id,
          booking_id: payment.booking_id,
          host_id: payment.booking.spaces.host_id,
          breakdown: {
            host_fee: hostFee,
            host_vat: hostVat,
            total: hostFee + hostVat
          }
        }
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success('Fattura rigenerata con successo', {
        description: `Numero: ${data.invoice?.invoice_number}`
      });
      queryClient.invalidateQueries({ queryKey: ['admin-payments-without-invoice'] });
      queryClient.invalidateQueries({ queryKey: ['admin-reconciliation-stats'] });
    },
    onError: (error: Error) => {
      sreLogger.error('Error regenerating invoice', { error });
      toast.error('Errore nella rigenerazione della fattura', {
        description: error.message
      });
    }
  });

  // Export CSV
  const exportReconciliationCSV = async () => {
    try {
      const payments = paymentsWithoutInvoiceQuery.data || [];
      
      const csvHeader = 'Payment ID,Booking ID,Host ID,Space,Amount,Date,Status\n';
      const csvRows = payments.map(p => {
        const hostId = p.booking?.spaces?.host_id || 'N/A';
        const spaceTitle = p.booking?.spaces?.title || 'N/A';
        return `${p.id},${p.booking_id},${hostId},"${spaceTitle}",${p.amount},${p.created_at},${p.payment_status}`;
      }).join('\n');

      const csv = csvHeader + csvRows;
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `payments-without-invoice-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success('CSV esportato con successo');
      sreLogger.info('CSV exported', { rowCount: payments.length });
    } catch (error) {
      sreLogger.error('Error exporting CSV', { error });
      toast.error('Errore durante l\'esportazione del CSV');
    }
  };

  return {
    paymentsWithoutInvoice: paymentsWithoutInvoiceQuery.data || [],
    isLoadingPayments: paymentsWithoutInvoiceQuery.isLoading,
    stats: statsQuery.data,
    isLoadingStats: statsQuery.isLoading,
    regenerateInvoice: regenerateInvoice.mutate,
    isRegenerating: regenerateInvoice.isPending,
    exportReconciliationCSV,
    refetch: () => {
      paymentsWithoutInvoiceQuery.refetch();
      statsQuery.refetch();
    }
  };
};
