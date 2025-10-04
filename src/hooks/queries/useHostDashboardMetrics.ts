
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/auth/useAuth";
import { calculateHostMetrics } from "./utils/hostMetricsCalculator";
import { TIME_CONSTANTS } from "@/constants";

export const useHostDashboardMetrics = () => {
  const { authState } = useAuth();

  return useQuery({
    queryKey: ['host-dashboard-metrics', authState.user?.id],
    queryFn: async () => {
      if (!authState.user?.id) throw new Error('No authenticated user');
      return calculateHostMetrics(authState.user.id);
    },
    enabled: !!authState.user?.id,
    staleTime: TIME_CONSTANTS.CACHE_DURATION,
    refetchOnWindowFocus: true,
  });
};
