
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/auth/useAuth";
import { fetchHostRecentActivity } from "./utils/hostActivityFetcher";

export const useHostRecentActivity = () => {
  const { authState } = useAuth();

  return useQuery({
    queryKey: ['host-recent-activity', authState.user?.id],
    queryFn: async () => {
      if (!authState.user?.id) return [];
      return fetchHostRecentActivity(authState.user.id);
    },
    enabled: !!authState.user?.id,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};
