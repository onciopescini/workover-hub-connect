import { useState, useMemo, useEffect } from 'react';
import { useAuth } from '@/hooks/auth/useAuth';
import useEnhancedHostDashboard from '@/hooks/queries/useEnhancedHostDashboard';
import { DashboardState } from '@/types/host/dashboard.types';
import { useSearchParams } from 'react-router-dom';
import { useHostProgress } from '@/hooks/useHostProgress';

export const useHostDashboardState = () => {
  const { authState } = useAuth();
  const { metrics, recentActivity, isLoading } = useEnhancedHostDashboard();
  const { data: progressData } = useHostProgress(); // ✅ FASE 4: Aggiungi hook progress
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

  // ✅ FASE 4: Check setup incompleto (inclusi KYC e tax_details)
  const dashboardState: DashboardState = useMemo(() => {
    const isSetupIncomplete = 
      !authState.profile?.stripe_connected ||
      !authState.profile?.onboarding_completed ||
      authState.profile?.kyc_documents_verified === null ||
      authState.profile?.kyc_documents_verified === false ||
      !progressData?.taxDetailsComplete;
      
    return {
      activeTab,
      shouldShowProgressTracker: isSetupIncomplete
    };
  }, [activeTab, authState.profile, progressData]);

  return {
    ...dashboardState,
    setActiveTab: handleSetActiveTab,
    metrics,
    recentActivity,
    isLoading,
    firstName: authState.profile?.first_name
  };
};