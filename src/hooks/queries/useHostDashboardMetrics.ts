import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthLogic } from '@/hooks/auth/useAuthLogic';
import { queryKeys } from "@/lib/react-query-config";

export const useHostDashboardMetrics = () => {
  const { authState } = useAuthLogic();
  const TIME_CONSTANTS = { CACHE_DURATION: 1000 * 60 * 5 }; // 5 minutes

  return useQuery({
    queryKey: queryKeys.hostDashboardMetrics.detail(authState.user?.id),
    queryFn: async () => {
      const userId = authState.user?.id;
      if (!userId) throw new Error('User ID not found');

      console.log('[Metrics] Fetching for:', userId);

      // 1. Fetch Summary via RPC (The fix: strictly use 'host_uuid')
      const { data: summaryData, error: summaryError } = await supabase
        .rpc('get_host_dashboard_summary', {
          host_uuid: userId
        });

      if (summaryError) {
        console.error('[Metrics] RPC Error:', summaryError);
        throw summaryError;
      }

      // 2. Fetch Recent Activity (The fix: Explicit columns, NO 'month')
      const { data: metricsData, error: metricsError } = await supabase
        .from('host_daily_metrics')
        .select('booking_date, total_bookings, confirmed_bookings, daily_revenue')
        .eq('host_id', userId)
        .order('booking_date', { ascending: false })
        .limit(30);

      if (metricsError) {
        console.error('[Metrics] DB Error:', metricsError);
        throw metricsError;
      }

      return {
        summary: summaryData,
        recentActivity: metricsData
      };
    },
    enabled: !!authState.user?.id,
    staleTime: TIME_CONSTANTS.CACHE_DURATION,
    retry: 1
  });
};
