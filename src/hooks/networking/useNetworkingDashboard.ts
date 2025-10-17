import { useState, useMemo, useCallback, useEffect } from 'react';
import { TIME_CONSTANTS } from '@/constants';
import { EnhancedNetworkingStats, Achievement, NetworkingDashboardState, NetworkingDashboardActions } from '@/types/networking-dashboard';
import { useAuth } from '@/hooks/auth/useAuth';
import { useQuery } from '@tanstack/react-query';
import { getNetworkingStats, calculateAchievements } from '@/lib/networking/networking-data-service';
import { useAchievements } from '@/hooks/useAchievements';
import { useProfileViews } from '@/hooks/useProfileViews';

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
  const { achievements: persistentAchievements, unlockAchievement } = useAchievements(authState.user?.id);
  const { viewCount: profileViews } = useProfileViews(authState.user?.id);

  // Fetch real networking data
  const { data: realStats, isLoading, refetch } = useQuery({
    queryKey: ['networking-stats', authState.user?.id],
    queryFn: () => getNetworkingStats(authState.user?.id || ''),
    enabled: !!authState.user?.id,
    staleTime: TIME_CONSTANTS.CACHE_DURATION, // 5 minutes
  });

  const processedStats = useMemo((): EnhancedNetworkingStats => {
    // Use real data if available
    if (realStats) {
      return {
        ...realStats,
        profileViews // Use real profile views from tracking
      };
    }

    // Minimal fallback - use only the provided stats + real profile views
    const engagementScore = Math.min(100, Math.floor(
      (stats.messagesThisWeek * 2 + profileViews) / 2
    ));
    
    const networkingScore = Math.min(100, Math.floor(
      (stats.totalConnections * 2 + stats.connectionRate) / 2
    ));

    return {
      ...stats,
      profileViews, // Use real tracked views
      weeklyGrowth: 0,
      monthlyGrowth: 0,
      engagementScore,
      networkingScore,
    };
  }, [stats, realStats, profileViews]);

  const achievements = useMemo((): Achievement[] => {
    const calculated = calculateAchievements(processedStats);
    
    // Merge with persistent achievements - prefer persistent data
    const mergedMap = new Map<string, Achievement>();
    
    // Add calculated achievements
    calculated.forEach(a => mergedMap.set(a.id, a));
    
    // Override with persistent achievements
    persistentAchievements.forEach(pa => {
      mergedMap.set(pa.achievement_id, {
        id: pa.achievement_id,
        title: pa.title,
        description: pa.description,
        unlocked: true,
        progress: pa.progress ?? 100,
        icon: pa.icon,
        category: pa.category as 'connections' | 'engagement' | 'activity'
      });
    });
    
    return Array.from(mergedMap.values());
  }, [processedStats, persistentAchievements]);
  
  // Auto-unlock achievements when thresholds are met
  useEffect(() => {
    achievements.forEach(achievement => {
      if (achievement.unlocked && achievement.progress === 100) {
        // Check if not already persisted
        const alreadyPersisted = persistentAchievements.some(
          pa => pa.achievement_id === achievement.id
        );
        
        if (!alreadyPersisted) {
          unlockAchievement(
            achievement.id,
            achievement.title,
            achievement.description,
            achievement.category as 'connections' | 'engagement' | 'activity',
            achievement.icon,
            achievement.progress ?? 100
          );
        }
      }
    });
  }, [achievements, persistentAchievements, unlockAchievement]);

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