import React, { Suspense } from 'react';
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton';

const NetworkingDashboard = React.lazy(() => 
  import('../NetworkingDashboard').then(module => ({
    default: module.NetworkingDashboard
  }))
);

interface LazyNetworkingDashboardProps {
  stats: {
    totalConnections: number;
    pendingRequests: number;
    messagesThisWeek: number;
    profileViews: number;
    connectionRate: number;
  };
}

export function LazyNetworkingDashboard({ stats }: LazyNetworkingDashboardProps) {
  return (
    <Suspense fallback={<LoadingSkeleton variant="networking" />}>
      <NetworkingDashboard stats={stats} />
    </Suspense>
  );
}