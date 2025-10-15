import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from 'react';

export interface HostPayment {
  id: string;
  amount: number;
  host_amount: number | null;
  platform_fee: number | null;
  currency: string;
  payment_status: string;
  created_at: string;
  stripe_transfer_id: string | null;
  receipt_url: string | null;
  booking: {
    id: string;
    booking_date: string;
    start_time: string;
    end_time: string;
    space: {
      id: string;
      title: string;
    };
    coworker: {
      first_name: string;
      last_name: string;
    };
  } | null;
  invoice: {
    invoice_number: string;
    pdf_file_url: string | null;
  }[] | null;
  non_fiscal_receipt: {
    receipt_number: string;
    pdf_url: string | null;
  }[] | null;
}

export const useHostPayments = () => {
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id || null);
    });
  }, []);

  return useQuery({
    queryKey: ['host-payments', userId],
    queryFn: async () => {
      if (!userId) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('payments')
        .select(`
          id,
          amount,
          host_amount,
          platform_fee,
          currency,
          payment_status,
          created_at,
          stripe_transfer_id,
          receipt_url,
          bookings!inner(
            id,
            booking_date,
            start_time,
            end_time,
            spaces!inner(
              id,
              title,
              host_id
            ),
            profiles!bookings_user_id_fkey(
              first_name,
              last_name
            )
          ),
          invoices!fk_invoices_payment_id(
            invoice_number,
            pdf_file_url
          ),
          non_fiscal_receipts!non_fiscal_receipts_payment_id_fkey(
            receipt_number,
            pdf_url
          )
        `)
        .eq('bookings.spaces.host_id', userId)
        .eq('payment_status', 'completed')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching host payments:', error);
        throw error;
      }

      // Transform data to match HostPayment interface
      return (data || []).map(payment => ({
        id: payment.id,
        amount: payment.amount,
        host_amount: payment.host_amount,
        platform_fee: payment.platform_fee,
        currency: payment.currency,
        payment_status: payment.payment_status,
        created_at: payment.created_at,
        stripe_transfer_id: payment.stripe_transfer_id,
        receipt_url: payment.receipt_url,
        booking: payment.bookings ? {
          id: payment.bookings.id,
          booking_date: payment.bookings.booking_date,
          start_time: payment.bookings.start_time || '',
          end_time: payment.bookings.end_time || '',
          space: {
            id: payment.bookings.spaces?.id || '',
            title: payment.bookings.spaces?.title || ''
          },
          coworker: Array.isArray(payment.bookings.profiles)
            ? payment.bookings.profiles[0]
            : payment.bookings.profiles || { first_name: '', last_name: '' }
        } : null,
        invoice: payment.invoices || null,
        non_fiscal_receipt: payment.non_fiscal_receipts || null
      })) as HostPayment[];
    },
    enabled: !!userId
  });
};

export const useHostPaymentStats = (payments: HostPayment[] | undefined) => {
  if (!payments) {
    return {
      totalGross: 0,
      totalNet: 0,
      platformFees: 0,
      paymentsCount: 0
    };
  }

  const totalGross = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
  const totalNet = payments.reduce((sum, p) => sum + (p.host_amount || 0), 0);
  const platformFees = totalGross - totalNet;

  return {
    totalGross,
    totalNet,
    platformFees,
    paymentsCount: payments.length
  };
};
