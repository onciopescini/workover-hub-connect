
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/auth/useAuth";
import { TIME_CONSTANTS } from "@/constants";
import { handleRLSError } from '@/lib/rls-error-handler';
import { toast } from 'sonner';
import { supabase } from "@/integrations/supabase/client";
import { HostDashboardMetrics } from "./types/hostDashboardTypes";
import { HostDashboardSummary, HostDailyMetric } from "@/types/db";
import { sreLogger } from '@/lib/sre-logger';

export const useHostDashboardMetrics = () => {
  const { authState } = useAuth();

  return useQuery({
    queryKey: ['host-dashboard-metrics', authState.user?.id],
    queryFn: async (): Promise<HostDashboardMetrics> => {
      if (!authState.user?.id) throw new Error('No authenticated user');
      
      const userId = authState.user.id;

      try {
        // 1. Fetch RPC Summary
        console.log('DEBUG RPC CALL:', {
          function: 'get_host_dashboard_summary',
          payload: { host_uuid: userId },
          userIdType: typeof userId
        });

        // Cast function name to any because it's not yet in the generated types
        const { data: summaryData, error: summaryError } = await supabase
          .rpc('get_host_dashboard_summary' as any, {
            host_uuid: userId
          });

        if (summaryError) throw summaryError;

        // Cast to our defined type as generated types might not be up to date
        const summary = summaryData as unknown as HostDashboardSummary;

        // 2. Fetch Host Daily Metrics (Materialized View)
        // We use type assertion here because the view might not be in the generated types yet
        const { data: metricsData, error: metricsError } = await supabase
          .from('host_daily_metrics' as any)
          .select('booking_date, total_bookings, confirmed_bookings, daily_revenue')
          .eq('host_id', userId);

        if (metricsError) throw metricsError;

        const dailyMetrics = (metricsData || []) as unknown as HostDailyMetric[];

        // 3. Calculate derived metrics
        const totalRevenue = dailyMetrics.reduce((sum, day) => sum + (day.daily_revenue || 0), 0);
        const totalBookings = dailyMetrics.reduce((sum, day) => sum + (day.total_bookings || 0), 0);
        const confirmedBookings = dailyMetrics.reduce((sum, day) => sum + (day.confirmed_bookings || 0), 0);

        // Average Booking Value
        const averageBookingValue = confirmedBookings > 0 ? totalRevenue / confirmedBookings : 0;

        // Revenue Growth (This Month vs Last Month)
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastMonth = lastMonthDate.getMonth();
        const lastMonthYear = lastMonthDate.getFullYear();

        const currentMonthRevenue = summary.current_month_revenue || 0;

        // Calculate last month revenue from daily metrics
        const lastMonthRevenue = dailyMetrics
          .filter(d => {
            // Parse YYYY-MM-DD manually to avoid timezone issues
            const parts = d.booking_date.split('-').map(Number);
            const year = parts[0];
            const month = parts[1];

            if (year === undefined || month === undefined) return false;

            // month is 1-based in string, convert to 0-based for comparison
            return (month - 1) === lastMonth && year === lastMonthYear;
          })
          .reduce((sum, d) => sum + (d.daily_revenue || 0), 0);

        let revenueGrowth = 0;
        if (lastMonthRevenue > 0) {
          revenueGrowth = ((currentMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100;
        } else if (currentMonthRevenue > 0) {
          revenueGrowth = 100;
        }

        // Occupancy Rate (Requires space count)
        // We'll do a lightweight fetch for space count
        const { count: spaceCount } = await supabase
          .from('workspaces')
          .select('id', { count: 'exact', head: true })
          .eq('host_id', userId);

        const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
        const confirmedBookingsThisMonth = dailyMetrics
          .filter(d => {
             // Parse YYYY-MM-DD manually
            const parts = d.booking_date.split('-').map(Number);
            const year = parts[0];
            const month = parts[1];

            if (year === undefined || month === undefined) return false;

            return (month - 1) === currentMonth && year === currentYear;
          })
          .reduce((sum, d) => sum + (d.confirmed_bookings || 0), 0);

        const potentialBookings = (spaceCount || 0) * daysInMonth;
        const occupancyRate = potentialBookings > 0
          ? (confirmedBookingsThisMonth / potentialBookings) * 100
          : 0;

        return {
          totalRevenue,
          monthlyRevenue: summary.current_month_revenue,
          totalBookings, // Note: This is now sum of all daily bookings (pending + confirmed + etc)
          pendingBookings: summary.pending_bookings,
          confirmedBookings,
          occupancyRate,
          averageBookingValue,
          revenueGrowth,
          topPerformingSpace: null, // Not available in view
        };

      } catch (error) {
        // Handle RLS errors with user-friendly messages
        const rlsResult = handleRLSError(error);
        if (rlsResult.isRLSError && rlsResult.shouldShowToast) {
          toast.error('Accesso negato', {
            description: rlsResult.userMessage,
            duration: 5000,
          });
        }

        sreLogger.error('Error fetching host dashboard metrics', { userId: authState.user?.id }, error as Error);
        throw error;
      }
    },
    enabled: !!authState.user?.id,
    staleTime: TIME_CONSTANTS.CACHE_DURATION,
    refetchOnWindowFocus: true,
  });
};
