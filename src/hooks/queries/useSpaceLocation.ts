import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { sreLogger } from '@/lib/sre-logger';
import { TIME_CONSTANTS } from '@/constants';
import { queryKeys } from "@/lib/react-query-config";

export interface SpaceLocation {
  space_id: string;
  latitude: number;
  longitude: number;
  address: string;
  created_at: string;
  updated_at: string;
}

/**
 * Hook to fetch precise space location (GPS coordinates + full address)
 * Only accessible by:
 * 1. Space owner (host_id = auth.uid())
 * 2. Users with confirmed booking for this space
 * 3. Admins
 * 
 * For public users without booking, only city-level location is shown.
 */
export const useSpaceLocation = (spaceId: string | undefined, enabled: boolean = true) => {
  return useQuery({
    queryKey: queryKeys.spaceLocation.detail(spaceId),
    queryFn: async () => {
      if (!spaceId) {
        throw new Error('Space ID is required');
      }

      const { data, error } = await supabase
        .from('space_locations')
        .select('*')
        .eq('space_id', spaceId)
        .maybeSingle();

      if (error) {
        // If error is "permission denied", it means user doesn't have access
        // This is expected for users without confirmed booking
        if (error.code === 'PGRST301' || error.message.includes('policy')) {
          sreLogger.debug('User does not have access to precise location', { 
            spaceId,
            reason: 'No confirmed booking or not space owner'
          });
          return null;
        }
        
        sreLogger.error('Error fetching space location', { spaceId }, error);
        throw error;
      }

      return data as SpaceLocation | null;
    },
    enabled: !!spaceId && enabled,
    staleTime: TIME_CONSTANTS.CACHE_DURATION,
    retry: false, // Don't retry on permission denied
  });
};

/**
 * Hook to check if current user has a confirmed booking for a space
 */
export const useHasConfirmedBooking = (spaceId: string | undefined) => {
  return useQuery({
    queryKey: queryKeys.spaceAccess.confirmedBooking(spaceId),
    queryFn: async () => {
      if (!spaceId) return false;

      const { data: session } = await supabase.auth.getSession();
      if (!session.session) return false;

      const { data, error } = await supabase
        .from('bookings')
        .select('id')
        .eq('space_id', spaceId)
        .eq('user_id', session.session.user.id)
        .eq('status', 'confirmed')
        .gte('booking_date', new Date().toISOString().split('T')[0])
        .limit(1)
        .maybeSingle();

      if (error) {
        sreLogger.error('Error checking confirmed booking', { spaceId }, error);
        return false;
      }

      return !!data;
    },
    enabled: !!spaceId,
    staleTime: TIME_CONSTANTS.CACHE_DURATION,
  });
};
