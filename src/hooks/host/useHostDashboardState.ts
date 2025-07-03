import { useState, useMemo } from 'react';
import { useAuth } from '@/hooks/auth/useAuth';
import useEnhancedHostDashboard from '@/hooks/queries/useEnhancedHostDashboard';
import { DashboardState } from '@/types/host/dashboard.types';

export const useHostDashboardState = () => {
  const { authState } = useAuth();
  const { metrics, recentActivity, isLoading } = useEnhancedHostDashboard();
  const [activeTab, setActiveTab] = useState('overview');

  const dashboardState: DashboardState = useMemo(() => ({
    activeTab,
    shouldShowProgressTracker: !authState.profile?.stripe_connected || !authState.profile?.onboarding_completed
  }), [activeTab, authState.profile?.stripe_connected, authState.profile?.onboarding_completed]);

  return {
    ...dashboardState,
    setActiveTab,
    metrics,
    recentActivity,
    isLoading,
    firstName: authState.profile?.first_name
  };
};