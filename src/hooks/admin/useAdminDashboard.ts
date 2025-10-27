import { useQuery } from '@tanstack/react-query';
import { getAdminStats } from '@/lib/admin-utils';
import { AdminStats } from '@/types/admin';
import { sreLogger } from '@/lib/sre-logger';

export interface AdminDashboardState {
  stats: AdminStats | null;
  isLoading: boolean;
  error: Error | null;
}

export interface AdminDashboardActions {
  refetch: () => void;
}

export const useAdminDashboard = () => {
  const { data: stats, isLoading, error, refetch } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      try {
        sreLogger.info('Fetching admin stats');
        const data = await getAdminStats();
        return data;
      } catch (err) {
        sreLogger.error('Error fetching admin stats', {}, err as Error);
        throw err;
      }
    },
    refetchInterval: 60000, // Auto-refresh every 60s
    staleTime: 30000, // Cache for 30s
    retry: 2,
  });

  const state: AdminDashboardState = {
    stats: stats || null,
    isLoading,
    error: error as Error | null
  };

  const actions: AdminDashboardActions = {
    refetch
  };

  return {
    ...state,
    ...actions
  };
};