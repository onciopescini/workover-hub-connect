
import React from 'react';
import { NetworkingDashboardContainer } from './dashboard/NetworkingDashboardContainer';
import { useRenderTracking } from '@/hooks/useMetricsCollection';

interface NetworkingDashboardProps {
  stats: {
    totalConnections: number;
    pendingRequests: number;
    messagesThisWeek: number;
    profileViews: number;
    connectionRate: number;
  };
}

export const NetworkingDashboard: React.FC<NetworkingDashboardProps> = (props) => {
  useRenderTracking('NetworkingDashboard');
  return <NetworkingDashboardContainer {...props} />;
};
