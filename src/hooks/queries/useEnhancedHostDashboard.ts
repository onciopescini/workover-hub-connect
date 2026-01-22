
import { useHostDashboardMetrics } from "./useHostDashboardMetrics";
import { useHostRecentActivity } from "./useHostRecentActivity";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/auth/useAuth";

// Re-export types for backward compatibility
export type { HostDashboardMetrics, RecentActivity } from "./types/hostDashboardTypes";
import { HostDashboardMetrics } from "./types/hostDashboardTypes";

const useEnhancedHostDashboard = () => {
  const { data, isLoading: metricsLoading, error: metricsError } = useHostDashboardMetrics();
  const { data: recentActivityFeed, isLoading: activityLoading, error: activityError } = useHostRecentActivity();
  const { authState } = useAuth();

  // Fetch space count for occupancy rate
  const { data: spaceCountData } = useQuery({
    queryKey: ['host-space-count', authState.user?.id],
    queryFn: async () => {
        if (!authState.user?.id) return 0;
        const { count } = await supabase
          .from('spaces')
          .select('id', { count: 'exact', head: true })
          .eq('host_id', authState.user.id);
        return count || 0;
    },
    enabled: !!authState.user?.id
  });

  const spaceCount = spaceCountData || 0;

  // Transform data to HostDashboardMetrics
  let metrics: HostDashboardMetrics | undefined = undefined;

  if (data) {
    // Cast strict types from the new hook
    const summary = data.summary as any;
    const dailyMetrics = data.recentActivity as any[];

    // Calculate derived metrics (Logic restored from original hook)
    const totalRevenue = dailyMetrics.reduce((sum, day) => sum + (day.daily_revenue || 0), 0);
    const totalBookings = dailyMetrics.reduce((sum, day) => sum + (day.total_bookings || 0), 0);
    const confirmedBookings = dailyMetrics.reduce((sum, day) => sum + (day.confirmed_bookings || 0), 0);
    const averageBookingValue = confirmedBookings > 0 ? totalRevenue / confirmedBookings : 0;

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonth = lastMonthDate.getMonth();
    const lastMonthYear = lastMonthDate.getFullYear();

    const currentMonthRevenue = summary?.current_month_revenue || 0;

    const lastMonthRevenue = dailyMetrics
      .filter(d => {
        const parts = d.booking_date.split('-').map(Number);
        const year = parts[0];
        const month = parts[1];
        if (year === undefined || month === undefined) return false;
        return (month - 1) === lastMonth && year === lastMonthYear;
      })
      .reduce((sum, d) => sum + (d.daily_revenue || 0), 0);

    let revenueGrowth = 0;
    if (lastMonthRevenue > 0) {
      revenueGrowth = ((currentMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100;
    } else if (currentMonthRevenue > 0) {
      revenueGrowth = 100;
    }

    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const confirmedBookingsThisMonth = dailyMetrics
      .filter(d => {
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

    metrics = {
      totalRevenue,
      monthlyRevenue: summary?.current_month_revenue || 0,
      totalBookings,
      pendingBookings: summary?.pending_bookings || 0,
      confirmedBookings,
      occupancyRate,
      averageBookingValue,
      revenueGrowth,
      topPerformingSpace: null,
    };
  }

  return {
    metrics,
    recentActivity: recentActivityFeed || [],
    isLoading: metricsLoading || activityLoading,
    error: metricsError || activityError
  };
};

export default useEnhancedHostDashboard;
