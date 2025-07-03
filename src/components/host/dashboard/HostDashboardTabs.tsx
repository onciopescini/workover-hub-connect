
import React from 'react';
import { Tabs } from '@/components/ui/tabs';
import { DashboardTabsNavigation } from './components/DashboardTabsNavigation';
import { OverviewTabContent } from './components/OverviewTabContent';
import { RevenueTabContent } from './components/RevenueTabContent';
import { AnalyticsTabContent } from './components/AnalyticsTabContent';
import { FinancialTabContent } from './components/FinancialTabContent';
import { PaymentsTabContent } from './components/PaymentsTabContent';
import { ManagementTabContent } from './components/ManagementTabContent';
import { DashboardTabsProps } from './types/dashboard-tabs-types';

export const HostDashboardTabs: React.FC<DashboardTabsProps> = ({
  activeTab,
  setActiveTab,
  metrics,
  recentActivity
}) => {
  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
      <DashboardTabsNavigation />

      <OverviewTabContent 
        metrics={metrics}
        recentActivity={recentActivity}
      />

      <RevenueTabContent 
        metrics={metrics}
        recentActivity={recentActivity}
      />

      <AnalyticsTabContent 
        metrics={metrics}
        recentActivity={recentActivity}
      />

      <FinancialTabContent metrics={metrics} />

      <PaymentsTabContent />

      <ManagementTabContent metrics={metrics} />
    </Tabs>
  );
};
