import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useFiscalMode } from "@/contexts/FiscalModeContext";
import { 
  createMockInvoice, 
  createMockReceipt,
  createMockSpaceForm,
  createMockHostFiscalProfile
} from "../../../tests/factories/mockData";

// Mock data generators
const generateMockReceipts = (year: number) => {
  return Array.from({ length: 5 }, (_, i) => {
    const receipt = createMockReceipt({
      receipt_date: new Date(year, i * 2, 15).toISOString().split('T')[0],
      receipt_number: `RNF-${year}-${String(i + 1).padStart(4, '0')}`,
    });
    
    return {
      ...receipt,
      booking: {
        booking_date: receipt.receipt_date,
        space: {
          title: `Mock Space ${i + 1}`,
        }
      },
      host: {
        first_name: 'Host',
        last_name: `MockHost${i + 1}`,
      }
    };
  });
};

const generateMockInvoices = (year: number) => {
  return Array.from({ length: 3 }, (_, i) => {
    const invoice = createMockInvoice({
      invoice_date: new Date(year, i * 3, 10).toISOString().split('T')[0],
      invoice_number: `INV-${year}-${String(i + 1).padStart(4, '0')}`,
    });
    const host = createMockHostFiscalProfile('ordinario');
    
    return {
      ...invoice,
      booking: {
        booking_date: invoice.invoice_date,
        space: {
          title: `Mock Coworking ${i + 1}`,
          host: {
            first_name: 'Giovanni',
            last_name: 'Bianchi',
            business_name: host.business_name,
            vat_number: host.vat_number,
          }
        }
      }
    };
  });
};

export const useCoworkerReceipts = (coworkerId: string, year?: number) => {
  const { isMockMode } = useFiscalMode();
  const currentYear = year || new Date().getFullYear();
  
  return useQuery({
    queryKey: ["coworker-receipts", coworkerId, year, isMockMode],
    queryFn: async () => {
      if (isMockMode) {
        console.log('[FISCAL MOCK] useCoworkerReceipts returning mock data');
        return generateMockReceipts(currentYear);
      }
      
      let query = supabase
        .from("non_fiscal_receipts")
        .select(`
          *,
          booking:bookings!inner(
            booking_date,
            space:spaces!inner(
              title
            )
          ),
          host:profiles!non_fiscal_receipts_host_id_fkey(
            first_name,
            last_name
          )
        `)
        .eq("coworker_id", coworkerId)
        .order("receipt_date", { ascending: false });

      if (year) {
        query = query
          .gte("receipt_date", `${year}-01-01`)
          .lt("receipt_date", `${year + 1}-01-01`);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Handle array returns from joins
      return (data || []).map((item: any) => ({
        ...item,
        booking: Array.isArray(item.booking) ? item.booking[0] : item.booking,
        host: Array.isArray(item.host) ? item.host[0] : item.host,
      }));
    },
    enabled: !!coworkerId,
  });
};

export const useCoworkerInvoices = (coworkerId: string, year?: number) => {
  const { isMockMode } = useFiscalMode();
  const currentYear = year || new Date().getFullYear();
  
  return useQuery({
    queryKey: ["coworker-invoices", coworkerId, year, isMockMode],
    queryFn: async () => {
      if (isMockMode) {
        console.log('[FISCAL MOCK] useCoworkerInvoices returning mock data');
        return generateMockInvoices(currentYear);
      }
      
      let query = supabase
        .from("invoices")
        .select(`
          *,
          booking:bookings!inner(
            booking_date,
            space:spaces!inner(
              title,
              host:profiles!spaces_host_id_fkey(
                first_name,
                last_name,
                business_name,
                vat_number
              )
            )
          )
        `)
        .eq("recipient_id", coworkerId)
        .order("invoice_date", { ascending: false });

      if (year) {
        query = query
          .gte("invoice_date", `${year}-01-01`)
          .lt("invoice_date", `${year + 1}-01-01`);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Handle array returns from joins
      return (data || []).map((item: any) => ({
        ...item,
        booking: Array.isArray(item.booking) ? item.booking[0] : item.booking,
      }));
    },
    enabled: !!coworkerId,
  });
};

export const useAllCoworkerDocuments = (coworkerId: string, year?: number) => {
  const { data: receipts } = useCoworkerReceipts(coworkerId, year);
  const { data: invoices } = useCoworkerInvoices(coworkerId, year);

  return {
    receipts: receipts || [],
    invoices: invoices || [],
    totalDocuments: (receipts?.length || 0) + (invoices?.length || 0),
  };
};
