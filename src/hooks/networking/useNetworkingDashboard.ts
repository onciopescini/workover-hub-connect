import { useState, useMemo, useCallback } from 'react';
import { EnhancedNetworkingStats, Achievement, NetworkingDashboardState, NetworkingDashboardActions } from '@/types/networking-dashboard';

interface UseNetworkingDashboardProps {
  stats: {
    totalConnections: number;
    pendingRequests: number;
    messagesThisWeek: number;
    eventsAttended: number;
    profileViews: number;
    connectionRate: number;
  };
}

export const useNetworkingDashboard = ({ stats }: UseNetworkingDashboardProps): NetworkingDashboardState & NetworkingDashboardActions => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const processedStats = useMemo((): EnhancedNetworkingStats => {
    // Calculate enhanced metrics
    const weeklyGrowth = Math.floor(Math.random() * 20) + 5; // Mock calculation
    const monthlyGrowth = Math.floor(Math.random() * 50) + 10; // Mock calculation
    
    // Calculate engagement score based on activity
    const engagementScore = Math.min(100, Math.floor(
      (stats.messagesThisWeek * 2 + stats.eventsAttended * 5 + stats.profileViews) / 2
    ));
    
    // Calculate networking score based on connections and growth
    const networkingScore = Math.min(100, Math.floor(
      (stats.totalConnections * 2 + stats.connectionRate + weeklyGrowth) / 2
    ));

    return {
      ...stats,
      weeklyGrowth,
      monthlyGrowth,
      engagementScore,
      networkingScore,
    };
  }, [stats]);

  const achievements = useMemo((): Achievement[] => {
    return [
      {
        id: '1',
        title: 'Network Builder',
        description: '10+ connessioni',
        unlocked: processedStats.totalConnections >= 10,
        progress: Math.min(100, (processedStats.totalConnections / 10) * 100),
        icon: 'users',
        category: 'connections'
      },
      {
        id: '2',
        title: 'Event Networker',
        description: '5+ eventi',
        unlocked: processedStats.eventsAttended >= 5,
        progress: Math.min(100, (processedStats.eventsAttended / 5) * 100),
        icon: 'calendar',
        category: 'activity'
      },
      {
        id: '3',
        title: 'Super Connector',
        description: '50+ connessioni',
        unlocked: processedStats.totalConnections >= 50,
        progress: Math.min(100, (processedStats.totalConnections / 50) * 100),
        icon: 'award',
        category: 'connections'
      },
    ];
  }, [processedStats]);

  const refreshStats = useCallback(() => {
    setIsLoading(true);
    setError(null);
    // Simulate refresh
    setTimeout(() => {
      setIsLoading(false);
    }, 1000);
  }, []);

  const calculateTrends = useCallback(() => {
    // Mock trend calculation
    console.log('Calculating trends...');
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