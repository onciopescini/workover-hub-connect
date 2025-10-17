import { useState, useMemo, useCallback, useEffect } from 'react';
import { TIME_CONSTANTS } from '@/constants';
import { EnhancedNetworkingStats, Achievement, NetworkingDashboardState, NetworkingDashboardActions } from '@/types/networking-dashboard';
import { useAuth } from '@/hooks/auth/useAuth';
import { useQuery } from '@tanstack/react-query';
import { getNetworkingStats, calculateAchievements } from '@/lib/networking/networking-data-service';

interface UseNetworkingDashboardProps {
  stats: {
    totalConnections: number;
    pendingRequests: number;
    messagesThisWeek: number;
    profileViews: number;
    connectionRate: number;
  };
}

export const useNetworkingDashboard = ({ stats }: UseNetworkingDashboardProps): NetworkingDashboardState & NetworkingDashboardActions => {
  const [error, setError] = useState<string | null>(null);
  const { authState } = useAuth();

  // Fetch real networking data
  const { data: realStats, isLoading, refetch } = useQuery({
    queryKey: ['networking-stats', authState.user?.id],
    queryFn: () => getNetworkingStats(authState.user?.id || ''),
    enabled: !!authState.user?.id,
    staleTime: TIME_CONSTANTS.CACHE_DURATION, // 5 minutes
  });

  const processedStats = useMemo((): EnhancedNetworkingStats => {
    // Use real data if available, return minimal fallback without random data
    if (realStats) {
      return realStats;
    }

    // Minimal fallback - use only the provided stats without mock data
    const engagementScore = Math.min(100, Math.floor(
      (stats.messagesThisWeek * 2 + stats.profileViews) / 2
    ));
    
    const networkingScore = Math.min(100, Math.floor(
      (stats.totalConnections * 2 + stats.connectionRate) / 2
    ));

    return {
      ...stats,
      weeklyGrowth: 0, // No growth data available without real stats
      monthlyGrowth: 0, // No growth data available without real stats
      engagementScore,
      networkingScore,
    };
  }, [stats, realStats]);

  const achievements = useMemo((): Achievement[] => {
    return calculateAchievements(processedStats);
  }, [processedStats]);

  const refreshStats = useCallback(async () => {
    setError(null);
    try {
      await refetch();
    } catch (err) {
      setError('Errore durante l\'aggiornamento dei dati');
    }
  }, [refetch]);

  const calculateTrends = useCallback(() => {
    // Mock trend calculation
    // Calculating trends for dashboard analytics
  }, []);

  return {
    processedStats,
    achievements,
    isLoading,
    error,
    refreshStats,
    calculateTrends,
  };
};