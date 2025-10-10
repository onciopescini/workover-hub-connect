import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface UseAdminBookingsProps {
  search?: string;
  statusFilter?: string;
  paymentFilter?: string;
}

export function useAdminBookings({ search = "", statusFilter = "", paymentFilter = "" }: UseAdminBookingsProps = {}) {
  const { data: bookings, isLoading, refetch } = useQuery({
    queryKey: ['admin-bookings', search, statusFilter, paymentFilter],
    queryFn: async () => {
      let query = supabase
        .from('bookings')
        .select(`
          *,
          space:spaces(id, title, address, host_id),
          coworker:profiles!bookings_user_id_fkey(id, first_name, last_name, profile_photo_url),
          payments(id, amount, payment_status, method, created_at)
        `)
        .order('created_at', { ascending: false });

      // Apply status filter
      if (statusFilter && statusFilter !== 'all') {
        query = query.eq('status', statusFilter as any);
      }

      // Apply payment filter
      if (paymentFilter) {
        // This is trickier - we'll filter in memory after the query
      }

      const { data, error } = await query;

      if (error) throw error;

      // Transform coworker from array to single object
      let filteredData = (data || []).map(booking => ({
        ...booking,
        coworker: Array.isArray(booking.coworker) ? booking.coworker[0] : booking.coworker
      }));

      // Apply search filter
      if (search) {
        const searchLower = search.toLowerCase();
        filteredData = filteredData.filter(booking => 
          booking.coworker?.first_name?.toLowerCase().includes(searchLower) ||
          booking.coworker?.last_name?.toLowerCase().includes(searchLower) ||
          booking.space?.title?.toLowerCase().includes(searchLower)
        );
      }

      // Apply payment status filter
      if (paymentFilter) {
        filteredData = filteredData.filter(booking =>
          booking.payments?.some((p: any) => p.payment_status === paymentFilter)
        );
      }

      return filteredData;
    }
  });

  return { bookings, isLoading, refetch };
}
