
import React, { lazy, Suspense } from 'react';
import { AccessGuard } from '@/components/shared/access/AccessGuard';
import { HostDashboardContent } from '@/components/host/dashboard/HostDashboardContent';
import { LoadingSkeleton } from '@/components/shared/access/LoadingSkeleton';
import { useHostDashboardState } from '@/hooks/host/useHostDashboardState';

const HostDashboardLayoutStitch = lazy(() => import('@/feature/host/HostDashboardLayoutStitch'));

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

  const isStitch = import.meta.env.VITE_UI_THEME === 'stitch';

  const dashboardContent = isLoading || !metrics ? (
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
  );

  return (
    <AccessGuard 
      requiredRoles={['host', 'admin']}
      loadingFallback={<LoadingSkeleton />}
    >
      {isStitch ? (
        <Suspense fallback={<div className="min-h-screen bg-[var(--color-bg)]" />}>
          <HostDashboardLayoutStitch>
            {dashboardContent}
          </HostDashboardLayoutStitch>
        </Suspense>
      ) : (
        dashboardContent
      )}
    </AccessGuard>
  );
};

export default HostDashboard;
