import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const useCoworkerReceipts = (coworkerId: string, year?: number) => {
  return useQuery({
    queryKey: ["coworker-receipts", coworkerId, year],
    queryFn: async () => {
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
  return useQuery({
    queryKey: ["coworker-invoices", coworkerId, year],
    queryFn: async () => {
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
