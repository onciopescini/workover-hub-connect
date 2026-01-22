import { useQuery, UseQueryResult } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from 'react';
import { queryKeys } from '@/lib/react-query-config';

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

export const useHostPayments = (): UseQueryResult<HostPayment[], Error> => {
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id || null);
    });
  }, []);

  return useQuery<HostPayment[], Error>({
    queryKey: queryKeys.hostPayments.list(userId ?? undefined),
    queryFn: async () => {
      if (!userId) throw new Error('User not authenticated');

      // Fetch payments with bookings (without nested spaces to avoid FK issues)
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
          booking_id,
          bookings!inner(
            id,
            booking_date,
            start_time,
            end_time,
            space_id,
            user_id
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
        .eq('payment_status', 'completed')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching host payments:', error);
        throw error;
      }

      // Fetch spaces separately
      const spaceIds = [...new Set(data?.map(p => p.bookings?.space_id).filter((id): id is string => id !== null) || [])];
      const { data: spaces } = await supabase
        .from('spaces')
        .select('id, title:name, host_id')
        .in('id', spaceIds)
        .eq('host_id', userId);
        
      const spacesMap = new Map(spaces?.map(s => [s.id, s]) || []);
      
      // Fetch coworker profiles separately
      const userIds = [...new Set(data?.map(p => p.bookings?.user_id).filter((id): id is string => id !== null) || [])];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, first_name, last_name')
        .in('id', userIds);
        
      const profilesMap = new Map(profiles?.map(p => [p.id, p]) || []);

      // Transform data to match HostPayment interface, filtering by host's spaces
      const payments = (data || [])
        .filter(payment => payment.bookings?.space_id && spacesMap.has(payment.bookings.space_id))
        .map(payment => {
          const space = payment.bookings?.space_id ? spacesMap.get(payment.bookings.space_id) : null;
          const coworker = payment.bookings?.user_id ? profilesMap.get(payment.bookings.user_id) : null;
          
          return {
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
              space: space ? { id: space.id, title: space.title } : { id: '', title: '' },
              coworker: coworker || { first_name: '', last_name: '' }
            } : null,
            invoice: payment.invoices || null,
            non_fiscal_receipt: payment.non_fiscal_receipts || null
          };
        });

      return payments;
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
