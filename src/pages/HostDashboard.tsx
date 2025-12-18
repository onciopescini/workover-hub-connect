
import React, { lazy, Suspense } from 'react';
import { AccessGuard } from '@/components/shared/access/AccessGuard';
import { HostDashboardContent } from '@/components/host/dashboard/HostDashboardContent';
import { HostWelcomeBanner } from '@/components/host/dashboard/HostWelcomeBanner';
import { LoadingSkeleton } from '@/components/shared/access/LoadingSkeleton';
import { useHostDashboardState } from '@/hooks/host/useHostDashboardState';
import { useAuth } from '@/hooks/auth/useAuth';

const HostDashboardLayoutStitch = lazy(() => import('@/feature/host/HostDashboardLayoutStitch'));

const HostDashboard = () => {
  const { authState } = useAuth();
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

  // Se l'utente è host ma non ha un profilo valido, mostra il banner di benvenuto
  // Verifica: authState.user esiste (grazie ad AccessGuard), ma authState.profile o authState.profile.id potrebbero mancare
  const showWelcomeBanner = !authState.profile?.id;

  const dashboardContent = isLoading || !metrics ? (
    <LoadingSkeleton />
  ) : showWelcomeBanner ? (
    <HostWelcomeBanner />
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
