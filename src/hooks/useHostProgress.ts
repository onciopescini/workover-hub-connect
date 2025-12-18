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
  kycVerified: boolean; // ✅ FASE 4: Nuovo campo
  taxDetailsComplete: boolean; // ✅ FASE 4: Nuovo campo
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
        .maybeSingle();

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

      // ✅ FASE 4: Get KYC status
      const { data: kycDocs } = await supabase
        .from('kyc_documents')
        .select('id, verification_status')
        .eq('user_id', userId)
        .limit(1)
        .maybeSingle();

      // ✅ FASE 4: Get tax_details completeness
      const { data: taxDetails } = await supabase
        .from('tax_details')
        .select('id')
        .eq('profile_id', userId)
        .eq('is_primary', true)
        .maybeSingle();

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
      
      // ✅ FASE 4: Nuovi campi di verifica
      const kycVerified = profile?.kyc_documents_verified === true;
      const taxDetailsComplete = !!taxDetails;

      return {
        spacesCount,
        publishedSpacesCount,
        totalBookings,
        completedBookings,
        totalRevenue,
        profileComplete,
        stripeConnected,
        stripeOnboardingStatus,
        hasPhotos,
        kycVerified,
        taxDetailsComplete
      };
    },
    enabled: !!userId && (authState.roles.includes('host') || authState.roles.includes('admin')),
    staleTime: options?.staleTime ?? TIME_CONSTANTS.CACHE_DURATION, // 5 minutes by default, configurable
    refetchOnWindowFocus: options?.refetchOnWindowFocus ?? false,
    // Aggiorna più frequentemente quando ci sono operazioni critiche in corso
    refetchInterval: (userId && !authState.profile?.stripe_connected) ? 30 * 1000 : false, // 30 seconds polling se Stripe non è ancora connesso
  });
};