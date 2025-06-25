
import React from 'react';
import { TabsContent } from '@/components/ui/tabs';
import { AdvancedFinancialMetrics } from '@/components/dashboard/AdvancedFinancialMetrics';
import { TabContentProps } from '../types/dashboard-tabs-types';

export const FinancialTabContent: React.FC<Pick<TabContentProps, 'metrics'>> = ({
  metrics
}) => {
  return (
    <TabsContent value="financial" className="space-y-6">
      <AdvancedFinancialMetrics
        totalRevenue={metrics.totalRevenue}
        monthlyRevenue={metrics.monthlyRevenue}
        revenueGrowth={metrics.revenueGrowth}
        averageBookingValue={metrics.averageBookingValue}
        occupancyRate={metrics.occupancyRate}
      />
    </TabsContent>
  );
};
