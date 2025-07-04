import { useEffect, useState, useCallback } from 'react';
import { useLogger } from '@/hooks/useLogger';
import { getAdminStats } from '@/lib/admin-utils';
import { AdminStats } from '@/types/admin';

export interface AdminDashboardState {
  stats: AdminStats | null;
  isLoading: boolean;
  error: Error | null;
}

export interface AdminDashboardActions {
  refetch: () => void;
}

export const useAdminDashboard = () => {
  const { error: logError } = useLogger({ context: 'useAdminDashboard' });
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const adminStats = await getAdminStats();
      setStats(adminStats);
    } catch (err) {
      logError('Error fetching admin stats', err as Error, {
        operation: 'fetch_admin_stats'
      });
      setError(err instanceof Error ? err : new Error('Failed to fetch admin stats'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refetch = useCallback(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const state: AdminDashboardState = {
    stats,
    isLoading,
    error
  };

  const actions: AdminDashboardActions = {
    refetch
  };

  return {
    ...state,
    ...actions
  };
};