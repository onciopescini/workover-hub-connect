import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface UseAdminBookingsProps {
  page?: number;
  pageSize?: number;
  search?: string;
  statusFilter?: string;
  paymentFilter?: string;
}

export function useAdminBookings({
  page = 1,
  pageSize = 20,
  search = "",
  statusFilter = "",
  paymentFilter = ""
}: UseAdminBookingsProps = {}) {

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin-bookings', page, pageSize, search, statusFilter, paymentFilter],
    queryFn: async () => {
      // Step 1: Handle Search (Pre-fetch IDs if needed)
      // Since complex cross-table OR search is hard, we'll try to find matching User IDs or Space IDs first
      let userIds: string[] | null = null;
      let spaceIds: string[] | null = null;

      if (search) {
        // Search Profiles
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id')
          .or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%`)
          .limit(100);

        if (profiles) userIds = profiles.map(p => p.id);

        // Search Spaces
        const { data: spaces } = await supabase
          .from('spaces')
          .select('id')
          .ilike('title', `%${search}%`)
          .limit(100);

        if (spaces) spaceIds = spaces.map(s => s.id);
      }

      // Step 2: Build Main Query
      // We use payments!inner if we need to filter by payment status
      const selectString = paymentFilter && paymentFilter !== 'all'
        ? `*, space:spaces(id, title, address, host_id), coworker:profiles!bookings_user_id_fkey(id, first_name, last_name, profile_photo_url), payments!inner(id, amount, payment_status, method, created_at)`
        : `*, space:spaces(id, title, address, host_id), coworker:profiles!bookings_user_id_fkey(id, first_name, last_name, profile_photo_url), payments(id, amount, payment_status, method, created_at)`;

      let query = supabase
        .from('bookings')
        .select(selectString, { count: 'exact' });

      // Apply Search Filter (IDs)
      if (search) {
        const conditions = [];
        if (userIds && userIds.length > 0) conditions.push(`user_id.in.(${userIds.join(',')})`);
        if (spaceIds && spaceIds.length > 0) conditions.push(`space_id.in.(${spaceIds.join(',')})`);

        if (conditions.length > 0) {
          query = query.or(conditions.join(','));
        } else {
          // Search term yielded no profiles or spaces, so return nothing
          // Using a condition that is always false
          query = query.eq('id', '00000000-0000-0000-0000-000000000000');
        }
      }

      // Apply Status Filter
      if (statusFilter && statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      // Apply Payment Filter
      if (paymentFilter && paymentFilter !== 'all') {
        query = query.eq('payments.payment_status', paymentFilter);
      }

      // Apply Pagination
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      query = query
        .order('created_at', { ascending: false })
        .range(from, to);

      const { data: rawData, error, count } = await query;

      if (error) throw error;

      // Transform coworker from array to single object
      // Supabase types might return array for joined relation if not 1:1 strictly defined in client types
      const bookings = (rawData || []).map((booking: any) => ({
        ...booking,
        coworker: Array.isArray(booking.coworker) ? booking.coworker[0] : booking.coworker,
        // Ensure payments is always an array
        payments: Array.isArray(booking.payments) ? booking.payments : (booking.payments ? [booking.payments] : [])
      }));

      return { bookings, count: count || 0 };
    },
    placeholderData: (previousData) => previousData, // Keep previous data while fetching new page
  });

  return {
    bookings: data?.bookings || [],
    totalCount: data?.count || 0,
    isLoading,
    refetch
  };
}
