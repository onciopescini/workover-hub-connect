import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/auth/useAuth';
import { format } from 'date-fns';
import { sreLogger } from '@/lib/sre-logger';

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

  useEffect(() => {
    const fetchWhoIsHere = async () => {
      if (!authState.user) return;

      setIsLoading(true);
      try {
        const today = format(new Date(), 'yyyy-MM-dd');

        // 1. Find my active check-in
        // We cast the response because workspaces is a joined relation
        const { data: bookings, error: bookingError } = await supabase
          .from('bookings')
          .select(`
            id,
            space_id,
            workspaces (
              id,
              name
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

        if (!bookings) {
          setUsers([]);
          setCurrentSpace(null);
          setIsLoading(false);
          return;
        }

        // Set current space info
        // Using any cast to handle the joined relation access safely
        const spaceData = (bookings as any).workspaces;
        if (spaceData) {
            setCurrentSpace({
                id: spaceData.id,
                name: spaceData.name
            });
        }

        // 2. Fetch coworkers in this booking/space
        // The RPC get_coworkers returns people in the same booking context (likely same space/date)
        const { data: coworkers, error: coworkersError } = await supabase.rpc('get_coworkers', {
          booking_id: bookings.id,
          current_user_id: authState.user.id
        });

        if (coworkersError) {
          sreLogger.error("Error fetching coworkers", { bookingId: bookings.id }, coworkersError);
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

  return { users, isLoading, currentSpace };
};
