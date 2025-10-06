
import React from 'react';
import { TabsContent } from '@/components/ui/tabs';
import { HostDashboardOverview } from '../HostDashboardOverview';
import { TabContentProps } from '../types/dashboard-tabs-types';

export const OverviewTabContent: React.FC<TabContentProps> = ({
  metrics,
  recentActivity
}) => {
  return (
    <TabsContent value="overview" className="space-y-6 mt-0">
      <HostDashboardOverview 
        metrics={metrics}
        recentActivity={recentActivity}
      />
    </TabsContent>
  );
};
