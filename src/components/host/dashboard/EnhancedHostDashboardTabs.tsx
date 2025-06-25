
import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AdvancedFinancialMetrics } from '@/components/dashboard/AdvancedFinancialMetrics';
import { ProfessionalPaymentHub } from '@/components/payments/ProfessionalPaymentHub';
import { AIInsightsCenter } from '@/components/dashboard/AIInsightsCenter';
import { EnhancedHostDashboardOverview } from './EnhancedHostDashboardOverview';
import { EnhancedHostDashboardManagement } from './EnhancedHostDashboardManagement';
import { HostDashboardMetrics, RecentActivity } from '@/hooks/queries/useEnhancedHostDashboard';

interface EnhancedHostDashboardTabsProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  metrics: HostDashboardMetrics;
  recentActivity: RecentActivity[];
}

export const EnhancedHostDashboardTabs: React.FC<EnhancedHostDashboardTabsProps> = ({
  activeTab,
  setActiveTab,
  metrics,
  recentActivity
}) => {
  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
      <TabsList className="grid w-full grid-cols-5">
        <TabsTrigger value="overview">Panoramica</TabsTrigger>
        <TabsTrigger value="financial">Finanze</TabsTrigger>
        <TabsTrigger value="payments">Pagamenti</TabsTrigger>
        <TabsTrigger value="insights">AI Insights</TabsTrigger>
        <TabsTrigger value="management">Gestione</TabsTrigger>
      </TabsList>

      <TabsContent value="overview" className="space-y-6">
        <EnhancedHostDashboardOverview 
          metrics={metrics}
          recentActivity={recentActivity}
        />
      </TabsContent>

      <TabsContent value="financial" className="space-y-6">
        <AdvancedFinancialMetrics
          totalRevenue={metrics.totalRevenue}
          monthlyRevenue={metrics.monthlyRevenue}
          revenueGrowth={metrics.revenueGrowth}
          averageBookingValue={metrics.averageBookingValue}
          occupancyRate={metrics.occupancyRate}
        />
      </TabsContent>

      <TabsContent value="payments" className="space-y-6">
        <ProfessionalPaymentHub />
      </TabsContent>

      <TabsContent value="insights" className="space-y-6">
        <AIInsightsCenter />
      </TabsContent>

      <TabsContent value="management" className="space-y-6">
        <EnhancedHostDashboardManagement metrics={metrics} />
      </TabsContent>
    </Tabs>
  );
};
