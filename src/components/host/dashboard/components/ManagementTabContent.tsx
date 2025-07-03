
import React from 'react';
import { TabsContent } from '@/components/ui/tabs';
import { HostDashboardManagement } from '../HostDashboardManagement';
import { TabContentProps } from '../types/dashboard-tabs-types';

export const ManagementTabContent: React.FC<Pick<TabContentProps, 'metrics'>> = ({
  metrics
}) => {
  return (
    <TabsContent value="management" className="space-y-6">
      <HostDashboardManagement metrics={metrics} />
    </TabsContent>
  );
};
