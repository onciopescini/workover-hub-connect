import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/OptimizedAuthContext';

interface HostProgressData {
  spacesCount: number;
  publishedSpacesCount: number;
  totalBookings: number;
  completedBookings: number;
  totalRevenue: number;
  profileComplete: boolean;
  stripeConnected: boolean;
  hasPhotos: boolean;
}

export const useHostProgress = () => {
  const { authState } = useAuth();
  const userId = authState.user?.id;

  return useQuery({
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
      const hasPhotos = spaces?.some(s => s.photos && s.photos.length > 0) || false;

      return {
        spacesCount,
        publishedSpacesCount,
        totalBookings,
        completedBookings,
        totalRevenue,
        profileComplete,
        stripeConnected,
        hasPhotos
      };
    },
    enabled: !!userId && authState.profile?.role === 'host',
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};