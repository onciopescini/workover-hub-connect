
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/auth/useAuth";
import { fetchHostRecentActivity } from "./utils/hostActivityFetcher";
import { queryKeys } from "@/lib/react-query-config";

export const useHostRecentActivity = () => {
  const { authState } = useAuth();

  return useQuery({
    queryKey: queryKeys.hostRecentActivity.detail(authState.user?.id),
    queryFn: async () => {
      if (!authState.user?.id) return [];
      return fetchHostRecentActivity(authState.user.id);
    },
    enabled: !!authState.user?.id,
    staleTime: 0, // Ensure fresh data is always fetched on mount
    refetchOnMount: true,
  });
};
