
import React from 'react';
import { TabsContent } from '@/components/ui/tabs';
import { EnhancedHostDashboardOverview } from '../EnhancedHostDashboardOverview';
import { TabContentProps } from '../types/dashboard-tabs-types';

export const OverviewTabContent: React.FC<TabContentProps> = ({
  metrics,
  recentActivity
}) => {
  return (
    <TabsContent value="overview" className="space-y-6">
      <EnhancedHostDashboardOverview 
        metrics={metrics}
        recentActivity={recentActivity}
      />
    </TabsContent>
  );
};
