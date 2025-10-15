import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useHostPendingInvoices = (hostId: string) => {
  return useQuery({
    queryKey: ['host-pending-invoices', hostId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payments')
        .select(`
          *,
          booking:bookings!inner(
            id,
            booking_date,
            start_time,
            end_time,
            coworker:profiles!bookings_user_id_fkey(
              first_name,
              last_name,
              email
            ),
            space:spaces!inner(
              id,
              title,
              host_id
            )
          )
        `)
        .eq('host_invoice_required', true)
        .eq('booking.space.host_id', hostId)
        .eq('host_invoice_reminder_sent', false)
        .order('host_invoice_deadline', { ascending: true });
      
      if (error) throw error;
      return data as any[];
    },
    enabled: !!hostId,
    refetchInterval: 30000 // Refresh every 30 seconds
  });
};

export const useHostPendingCreditNotes = (hostId: string) => {
  return useQuery({
    queryKey: ['host-pending-credit-notes', hostId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payments')
        .select(`
          *,
          booking:bookings!inner(
            id,
            booking_date,
            cancelled_at,
            cancellation_reason,
            space:spaces!inner(
              id,
              title,
              host_id
            ),
            coworker:profiles!bookings_user_id_fkey(
              first_name,
              last_name
            )
          )
        `)
        .eq('credit_note_required', true)
        .eq('booking.space.host_id', hostId)
        .eq('credit_note_issued_by_host', false)
        .order('credit_note_deadline', { ascending: true });
      
      if (error) throw error;
      return data as any[];
    },
    enabled: !!hostId,
    refetchInterval: 30000
  });
};

export const useHostInvoiceHistory = (hostId: string, year?: number) => {
  return useQuery({
    queryKey: ['host-invoice-history', hostId, year],
    queryFn: async () => {
      let query = supabase
        .from('payments')
        .select(`
          *,
          booking:bookings!inner(
            booking_date,
            space:spaces!inner(
              host_id
            ),
            coworker:profiles!bookings_user_id_fkey(
              first_name,
              last_name
            )
          )
        `)
        .eq('booking.space.host_id', hostId)
        .or('host_invoice_reminder_sent.eq.true,credit_note_issued_by_host.eq.true')
        .order('created_at', { ascending: false });
      
      if (year) {
        query = query
          .gte('created_at', `${year}-01-01`)
          .lt('created_at', `${year + 1}-01-01`);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as any[];
    },
    enabled: !!hostId
  });
};
