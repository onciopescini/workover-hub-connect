
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/auth/useAuth";
import { endOfDay, startOfDay } from "date-fns";
import { Database } from "@/integrations/supabase/types";
import { queryKeys } from "@/lib/react-query-config";

interface TodayCheckinGuest {
  first_name: string | null;
  last_name: string | null;
  profile_photo_url: string | null;
  avatarUrl: string | null;
}

interface TodayCheckinEntry {
  id: string;
  booking_date: string | null;
  status: Database["public"]["Enums"]["booking_status"] | null;
  start_time: string | null;
  end_time: string | null;
  space: {
    title: string | null;
    address: string | null;
  } | null;
  guest: TodayCheckinGuest | null;
}

type TodayCheckinRow = Omit<TodayCheckinEntry, "guest"> & {
  guest: Omit<TodayCheckinGuest, "avatarUrl"> | null;
};

export const useTodayCheckins = () => {
  const { authState } = useAuth();

  return useQuery({
    queryKey: queryKeys.todayCheckins.list(authState.user?.id),
    queryFn: async (): Promise<TodayCheckinEntry[]> => {
      if (!authState.user?.id) return [];

      const validStatuses = ['confirmed', 'pending_payment', 'checked_in'] as Database["public"]["Enums"]["booking_status"][];
      const now = new Date();
      const startTime = startOfDay(now).toISOString();
      const endTime = endOfDay(now).toISOString();

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
        .gte('start_time', startTime)
        .lte('start_time', endTime)
        .in('status', validStatuses)
        .order('start_time', { ascending: true })
        .overrideTypes<TodayCheckinRow[]>();

      if (error) throw error;
      return (data ?? []).map((booking) => ({
        ...booking,
        guest: booking.guest
          ? {
              ...booking.guest,
              avatarUrl: booking.guest.profile_photo_url || null,
            }
          : null,
      }));
    },
    enabled: !!authState.user?.id,
    refetchInterval: 30000 // Refresh every 30 seconds as this is operational data
  });
};
