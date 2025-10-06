import { useState, useMemo, useEffect } from 'react';
import { useAuth } from '@/hooks/auth/useAuth';
import useEnhancedHostDashboard from '@/hooks/queries/useEnhancedHostDashboard';
import { DashboardState } from '@/types/host/dashboard.types';
import { useSearchParams } from 'react-router-dom';

export const useHostDashboardState = () => {
  const { authState } = useAuth();
  const { metrics, recentActivity, isLoading } = useEnhancedHostDashboard();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(() => {
    return searchParams.get('tab') || 'overview';
  });

  // Sync activeTab with URL params
  useEffect(() => {
    const tabFromUrl = searchParams.get('tab');
    if (tabFromUrl && tabFromUrl !== activeTab) {
      setActiveTab(tabFromUrl);
    }
  }, [searchParams]);

  // Update URL when tab changes
  const handleSetActiveTab = (tab: string) => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  const dashboardState: DashboardState = useMemo(() => ({
    activeTab,
    shouldShowProgressTracker: !authState.profile?.stripe_connected || !authState.profile?.onboarding_completed
  }), [activeTab, authState.profile?.stripe_connected, authState.profile?.onboarding_completed]);

  return {
    ...dashboardState,
    setActiveTab: handleSetActiveTab,
    metrics,
    recentActivity,
    isLoading,
    firstName: authState.profile?.first_name
  };
};