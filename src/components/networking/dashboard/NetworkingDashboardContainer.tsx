import React from 'react';
import { useNetworkingDashboard } from '@/hooks/networking/useNetworkingDashboard';
import { NetworkingDashboardUI } from './NetworkingDashboardUI';
import { NetworkingDashboardProps } from '@/types/networking-dashboard';

export function NetworkingDashboardContainer({ stats }: NetworkingDashboardProps) {
  const dashboardState = useNetworkingDashboard({ stats });

  return <NetworkingDashboardUI {...dashboardState} />;
}