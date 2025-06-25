
import { useHostDashboardMetrics } from "./useHostDashboardMetrics";
import { useHostRecentActivity } from "./useHostRecentActivity";

// Re-export types for backward compatibility
export type { HostDashboardMetrics, RecentActivity } from "./types/hostDashboardTypes";

const useEnhancedHostDashboard = () => {
  const { data: metrics, isLoading: metricsLoading } = useHostDashboardMetrics();
  const { data: recentActivity, isLoading: activityLoading } = useHostRecentActivity();

  return {
    metrics,
    recentActivity: recentActivity || [],
    isLoading: metricsLoading || activityLoading,
  };
};

export default useEnhancedHostDashboard;
