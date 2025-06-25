
import React from 'react';
import { TabsContent } from '@/components/ui/tabs';
import { EnhancedHostDashboardManagement } from '../EnhancedHostDashboardManagement';
import { TabContentProps } from '../types/dashboard-tabs-types';

export const ManagementTabContent: React.FC<Pick<TabContentProps, 'metrics'>> = ({
  metrics
}) => {
  return (
    <TabsContent value="management" className="space-y-6">
      <EnhancedHostDashboardManagement metrics={metrics} />
    </TabsContent>
  );
};
