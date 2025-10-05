import { useQuery } from '@tanstack/react-query';
import { TIME_CONSTANTS } from '@/constants';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/auth/useAuth';

interface HostProgressData {
  spacesCount: number;
  publishedSpacesCount: number;
  totalBookings: number;
  completedBookings: number;
  totalRevenue: number;
  profileComplete: boolean;
  stripeConnected: boolean;
  stripeOnboardingStatus: 'none' | 'pending' | 'completed' | 'restricted';
  hasPhotos: boolean;
}

export const useHostProgress = (options?: { 
  refetchOnWindowFocus?: boolean;
  staleTime?: number;
}) => {
  const { authState } = useAuth();
  const userId = authState.user?.id;

  return useQuery<HostProgressData>({
    queryKey: ['host-progress', userId],
    queryFn: async (): Promise<HostProgressData> => {
      if (!userId) throw new Error('User not authenticated');

      // Get user profile data
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      // Get spaces data
      const { data: spaces } = await supabase
        .from('spaces')
        .select('id, published, photos')
        .eq('host_id', userId);

      // Get bookings data
      const { data: bookings } = await supabase
        .from('bookings')
        .select('id, status')
        .in('space_id', spaces?.map(s => s.id) || []);

      // Get payments data for revenue calculation
      const { data: payments } = await supabase
        .from('payments')
        .select('host_amount')
        .eq('payment_status', 'completed')
        .in('booking_id', bookings?.map(b => b.id) || []);

      const spacesCount = spaces?.length || 0;
      const publishedSpacesCount = spaces?.filter(s => s.published).length || 0;
      const totalBookings = bookings?.length || 0;
      const completedBookings = bookings?.filter(b => b.status === 'confirmed').length || 0;
      const totalRevenue = payments?.reduce((sum, p) => sum + (p.host_amount || 0), 0) || 0;
      
      const profileComplete = !!(
        profile?.first_name && 
        profile?.last_name && 
        profile?.bio && 
        profile?.profession
      );
      
      const stripeConnected = !!profile?.stripe_connected;
      const stripeOnboardingStatus = profile?.stripe_onboarding_status || 'none';
      const hasPhotos = spaces?.some(s => s.photos && s.photos.length > 0) || false;

      return {
        spacesCount,
        publishedSpacesCount,
        totalBookings,
        completedBookings,
        totalRevenue,
        profileComplete,
        stripeConnected,
        stripeOnboardingStatus,
        hasPhotos
      };
    },
    enabled: !!userId && authState.profile?.role === 'host',
    staleTime: options?.staleTime ?? TIME_CONSTANTS.CACHE_DURATION, // 5 minutes by default, configurable
    refetchOnWindowFocus: options?.refetchOnWindowFocus ?? false,
    // Aggiorna più frequentemente quando ci sono operazioni critiche in corso
    refetchInterval: (userId && !authState.profile?.stripe_connected) ? 30 * 1000 : false, // 30 seconds polling se Stripe non è ancora connesso
  });
};