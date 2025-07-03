
import React from 'react';
import { NetworkingDashboardContainer } from './dashboard/NetworkingDashboardContainer';

interface NetworkingDashboardProps {
  stats: {
    totalConnections: number;
    pendingRequests: number;
    messagesThisWeek: number;
    eventsAttended: number;
    profileViews: number;
    connectionRate: number;
  };
}

export const NetworkingDashboard: React.FC<NetworkingDashboardProps> = (props) => {
  return <NetworkingDashboardContainer {...props} />;
};
