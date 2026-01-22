
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/auth/useAuth";
import type { Database } from "@/integrations/supabase/types";

export interface TodayCheckin {
  id: string;
  guest_name: string;
  guest_avatar?: string;
  space_name: string;
  start_time: string;
  end_time: string;
  status: string;
}

type TodayCheckinRow = {
  id: Database["public"]["Tables"]["bookings"]["Row"]["id"];
  start_time: Database["public"]["Tables"]["bookings"]["Row"]["start_time"];
  end_time: Database["public"]["Tables"]["bookings"]["Row"]["end_time"];
  status: Database["public"]["Tables"]["bookings"]["Row"]["status"];
  profiles: Pick<
    Database["public"]["Tables"]["profiles"]["Row"],
    "first_name" | "last_name" | "profile_photo_url"
  > | null;
  spaces: Pick<
    Database["public"]["Tables"]["spaces"]["Row"],
    "title" | "host_id"
  > | null;
};

export const useTodayCheckins = () => {
  const { authState } = useAuth();
  const userId = authState.user?.id;

  return useQuery({
    queryKey: ['today-checkins', userId],
    queryFn: async () => {
      if (!userId) return [];

      const today = new Date();
      const startOfDay = new Date(today.setHours(0, 0, 0, 0)).toISOString();
      const endOfDay = new Date(today.setHours(23, 59, 59, 999)).toISOString();

      // Using !inner on spaces to ensure we filter bookings where the related space has this host_id
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          id,
          start_time,
          end_time,
          status,
          profiles:user_id (
            first_name,
            last_name,
            profile_photo_url
          ),
          spaces!inner (
            title,
            host_id
          )
        `)
        .eq('spaces.host_id', userId)
        .gte('start_time', startOfDay)
        .lte('start_time', endOfDay)
        .eq('status', 'confirmed')
        .order('start_time', { ascending: true });

      if (error) {
        console.error('Error fetching today check-ins:', error);
        throw error;
      }

      return (data ?? []).map((booking: TodayCheckinRow) => ({
        id: booking.id,
        guest_name: `${booking.profiles?.first_name || ''} ${booking.profiles?.last_name || ''}`.trim() || 'Ospite',
        guest_avatar: booking.profiles?.profile_photo_url ?? undefined,
        space_name: booking.spaces?.title || 'Spazio',
        start_time: booking.start_time,
        end_time: booking.end_time,
        status: booking.status
      }));
    },
    enabled: !!userId,
  });
};
