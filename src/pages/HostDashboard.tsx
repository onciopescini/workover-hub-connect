
import React from 'react';
import { AccessGuard } from '@/components/shared/access/AccessGuard';
import { HostDashboardContent } from '@/components/host/dashboard/HostDashboardContent';
import { LoadingSkeleton } from '@/components/shared/access/LoadingSkeleton';
import { useHostDashboardState } from '@/hooks/host/useHostDashboardState';

const HostDashboard = () => {
  const {
    activeTab,
    setActiveTab,
    shouldShowProgressTracker,
    metrics,
    recentActivity,
    isLoading,
    firstName
  } = useHostDashboardState();

  return (
    <AccessGuard 
      requiredRoles={['host', 'admin']}
      loadingFallback={<LoadingSkeleton />}
    >
      {isLoading || !metrics ? (
        <LoadingSkeleton />
      ) : (
        <HostDashboardContent
          firstName={firstName ?? ''}
          metrics={metrics}
          recentActivity={recentActivity}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          shouldShowProgressTracker={shouldShowProgressTracker}
        />
      )}
    </AccessGuard>
  );
};

export default HostDashboard;
