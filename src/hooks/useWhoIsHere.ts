import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/auth/useAuth';
import { format } from 'date-fns';
import { sreLogger } from '@/lib/sre-logger';
import type { Database } from '@/integrations/supabase/types';

type SpaceRow = Database['public']['Tables']['spaces']['Row'];
type BookingWithSpace = Database['public']['Tables']['bookings']['Row'] & {
  spaces: Pick<SpaceRow, 'id' | 'title'> | null;
};

export interface WhoIsHereUser {
  id: string;
  first_name: string;
  last_name: string;
  avatar_url: string | null;
  job_title: string | null;
  city: string | null;
}

export const useWhoIsHere = () => {
  const { authState } = useAuth();
  const [users, setUsers] = useState<WhoIsHereUser[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentSpace, setCurrentSpace] = useState<{ id: string; name: string } | null>(null);
  const [isNetworkingEnabled, setIsNetworkingEnabled] = useState<boolean>(true);

  useEffect(() => {
    const fetchWhoIsHere = async () => {
      if (!authState.user) return;

      setIsLoading(true);
      try {
        // 0. Check Privacy Settings first
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('networking_enabled')
          .eq('id', authState.user.id)
          .single();

        if (profileError) {
          sreLogger.error("Error fetching profile settings", { userId: authState.user.id }, profileError);
        }

        const enabled = profile?.networking_enabled ?? true;
        setIsNetworkingEnabled(enabled);

        // If networking is disabled, we don't fetch anything else (Reciprocity)
        if (!enabled) {
          setUsers([]);
          setCurrentSpace(null);
          setIsLoading(false);
          return;
        }

        const today = format(new Date(), 'yyyy-MM-dd');

        // 1. Find my active check-in
        const { data: booking, error: bookingError } = await supabase
          .from('bookings')
          .select(`
            id,
            space_id,
            spaces (
              id,
              title
            )
          `)
          .eq('user_id', authState.user.id)
          .eq('status', 'checked_in')
          .eq('booking_date', today)
          .maybeSingle();

        if (bookingError) {
          sreLogger.error("Error fetching active booking", { userId: authState.user.id }, bookingError);
          setIsLoading(false);
          return;
        }

        const bookingData = booking as BookingWithSpace | null;

        if (!bookingData) {
          setUsers([]);
          setCurrentSpace(null);
          setIsLoading(false);
          return;
        }

        // Set current space info
        const spaceData = bookingData.spaces;
        if (spaceData) {
            setCurrentSpace({
                id: spaceData.id,
                name: spaceData.title
            });
        }

        // 2. Fetch coworkers in this booking/space
        const { data: coworkers, error: coworkersError } = await supabase.rpc('get_coworkers');

        if (coworkersError) {
          sreLogger.error("Error fetching coworkers", { bookingId: bookingData.id }, coworkersError);
        } else {
          setUsers((coworkers || []).map((c: any) => ({
            id: c.id,
            first_name: c.first_name,
            last_name: c.last_name,
            avatar_url: c.avatar_url,
            job_title: c.job_title ?? null,
            city: c.city ?? null
          })));
        }

      } catch (err) {
        sreLogger.error("Unexpected error in useWhoIsHere", {}, err as Error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchWhoIsHere();
  }, [authState.user]);

  return { users, isLoading, currentSpace, isNetworkingEnabled };
};
