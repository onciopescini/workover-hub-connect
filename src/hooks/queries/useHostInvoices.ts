import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useFiscalMode } from '@/contexts/FiscalModeContext';
import { 
  createMockPaymentWithInvoice, 
  createMockPaymentWithCreditNote,
  createMockHostFiscalProfile,
  createMockCoworkerFiscalData,
  createMockSpaceForm
} from '../../../tests/factories/mockData';

// Mock data generators
const generateMockPendingInvoices = () => {
  return Array.from({ length: 3 }, (_, i) => {
    const payment = createMockPaymentWithInvoice({
      host_invoice_deadline: new Date(Date.now() + (7 - i) * 24 * 60 * 60 * 1000).toISOString(),
    });
    const coworker = createMockCoworkerFiscalData(false);
    const space = createMockSpaceForm();
    
    return {
      ...payment,
      booking: {
        id: payment.booking_id,
        booking_date: new Date(Date.now() + i * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        start_time: '09:00',
        end_time: '18:00',
        coworker: {
          first_name: 'Mario',
          last_name: 'Rossi',
          email: `coworker${i}@test.com`,
        },
        space: {
          id: payment.booking_id,
          title: `Mock Space ${i + 1}`,
          host_id: payment.user_id,
        }
      }
    };
  });
};

const generateMockCreditNotes = () => {
  return Array.from({ length: 2 }, (_, i) => {
    const payment = createMockPaymentWithCreditNote({
      credit_note_deadline: new Date(Date.now() + (3 - i) * 24 * 60 * 60 * 1000).toISOString(),
    });
    const space = createMockSpaceForm();
    
    return {
      ...payment,
      booking: {
        id: payment.booking_id,
        booking_date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        cancelled_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        cancellation_reason: 'Mock cancellation reason',
        space: {
          id: payment.booking_id,
          title: `Mock Space CN ${i + 1}`,
          host_id: payment.user_id,
        },
        coworker: {
          first_name: 'Mario',
          last_name: 'Rossi',
        }
      }
    };
  });
};

export const useHostPendingInvoices = (hostId: string) => {
  const { isMockMode } = useFiscalMode();
  
  return useQuery({
    queryKey: ['host-pending-invoices', hostId, isMockMode],
    queryFn: async () => {
      if (isMockMode) {
        console.log('[FISCAL MOCK] useHostPendingInvoices returning mock data');
        return generateMockPendingInvoices();
      }
      
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
    refetchInterval: isMockMode ? false : 30000
  });
};

export const useHostPendingCreditNotes = (hostId: string) => {
  const { isMockMode } = useFiscalMode();
  
  return useQuery({
    queryKey: ['host-pending-credit-notes', hostId, isMockMode],
    queryFn: async () => {
      if (isMockMode) {
        console.log('[FISCAL MOCK] useHostPendingCreditNotes returning mock data');
        return generateMockCreditNotes();
      }
      
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
    refetchInterval: isMockMode ? false : 30000
  });
};

export const useHostInvoiceHistory = (hostId: string, year?: number) => {
  const { isMockMode } = useFiscalMode();
  
  return useQuery({
    queryKey: ['host-invoice-history', hostId, year, isMockMode],
    queryFn: async () => {
      if (isMockMode) {
        console.log('[FISCAL MOCK] useHostInvoiceHistory returning mock data');
        return [
          ...generateMockPendingInvoices().map(p => ({
            ...p,
            host_invoice_reminder_sent: true,
          })),
          ...generateMockCreditNotes().map(cn => ({
            ...cn,
            credit_note_issued_by_host: true,
          }))
        ];
      }
      
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
