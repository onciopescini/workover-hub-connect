import React, { Suspense } from 'react';
import { NetworkingDashboardState, NetworkingDashboardActions } from '@/types/networking-dashboard';
import { NetworkingDashboardLayout } from './NetworkingDashboardLayout';
import { NetworkingHeroSection } from './NetworkingHeroSection';
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton';

// Lazy load heavy components
const LazyNetworkingStatsCards = React.lazy(() => 
  import('./NetworkingStatsCards').then(m => ({ default: m.NetworkingStatsCards }))
);

const LazyNetworkingQuickActions = React.lazy(() => 
  import('./NetworkingQuickActions').then(m => ({ default: m.NetworkingQuickActions }))
);

const LazyNetworkingAchievements = React.lazy(() => 
  import('./NetworkingAchievements').then(m => ({ default: m.NetworkingAchievements }))
);

interface NetworkingDashboardUIProps extends NetworkingDashboardState, NetworkingDashboardActions {}

export function NetworkingDashboardUI({ 
  processedStats, 
  achievements, 
  isLoading,
  error,
  refreshStats,
  calculateTrends
}: NetworkingDashboardUIProps) {
  if (error) {
    return (
      <NetworkingDashboardLayout>
        <div className="text-center py-12">
          <p className="text-destructive mb-4">Errore nel caricamento: {error}</p>
          <button onClick={refreshStats} className="text-primary hover:underline">
            Riprova
          </button>
        </div>
      </NetworkingDashboardLayout>
    );
  }

  return (
    <NetworkingDashboardLayout>
      {/* Hero Section - Always visible */}
      <NetworkingHeroSection stats={processedStats} />
      
      {/* Stats Cards - Lazy loaded */}
      <Suspense fallback={<LoadingSkeleton variant="networking" />}>
        <LazyNetworkingStatsCards stats={processedStats} />
      </Suspense>

      {/* Quick Actions - Lazy loaded */}
      <Suspense fallback={<LoadingSkeleton variant="default" />}>
        <LazyNetworkingQuickActions />
      </Suspense>

      {/* Achievements - Lazy loaded */}
      <Suspense fallback={<LoadingSkeleton variant="default" />}>
        <LazyNetworkingAchievements achievements={achievements} />
      </Suspense>
    </NetworkingDashboardLayout>
  );
}