
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/auth/useAuth";
import { fetchHostRecentActivity } from "./utils/hostActivityFetcher";
import { TIME_CONSTANTS } from "@/constants";

export const useHostRecentActivity = () => {
  const { authState } = useAuth();

  return useQuery({
    queryKey: ['host-recent-activity', authState.user?.id],
    queryFn: async () => {
      if (!authState.user?.id) return [];
      return fetchHostRecentActivity(authState.user.id);
    },
    enabled: !!authState.user?.id,
    staleTime: TIME_CONSTANTS.CALENDAR_REFRESH,
  });
};
