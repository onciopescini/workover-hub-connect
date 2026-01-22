
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/auth/useAuth";
import { format } from "date-fns";
import { Database } from "@/integrations/supabase/types";
import { queryKeys } from "@/lib/react-query-config";

export const useTodayCheckins = () => {
  const { authState } = useAuth();

  return useQuery({
    queryKey: queryKeys.todayCheckins.list(authState.user?.id),
    queryFn: async () => {
      if (!authState.user?.id) return [];

      // Use local date instead of UTC
      const today = format(new Date(), 'yyyy-MM-dd');
      const validStatuses = ['confirmed', 'pending_payment', 'checked_in'] as Database["public"]["Enums"]["booking_status"][];

      const { data, error } = await supabase
        .from('bookings')
        .select(`
          id,
          booking_date,
          status,
          start_time,
          end_time,
          space:spaces(title, address),
          guest:profiles!fk_bookings_user_id(first_name, last_name, profile_photo_url)
        `)
        .eq('booking_date', today)
        .in('status', validStatuses)
        .order('start_time', { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!authState.user?.id,
    refetchInterval: 30000 // Refresh every 30 seconds as this is operational data
  });
};
