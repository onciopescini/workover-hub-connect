import { HostDashboardHeader } from "./HostDashboardHeader";
import { HostDashboardMetrics } from "./HostDashboardMetrics";
import { HostDashboardTabs } from "./HostDashboardTabs";
import { HostProgressTracker } from "../onboarding/HostProgressTracker";
import { HostDashboardContentProps } from "@/types/host/dashboard.types";

export const HostDashboardContent = ({
  firstName,
  metrics,
  recentActivity,
  activeTab,
  setActiveTab,
  shouldShowProgressTracker
}: HostDashboardContentProps) => {
  return (
    <div className="container mx-auto py-8 space-y-8">
      <HostDashboardHeader firstName={firstName ?? ''} />
      
      {metrics && <HostDashboardMetrics metrics={metrics} />}
      
      {shouldShowProgressTracker && <HostProgressTracker />}
      
      <HostDashboardTabs 
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        metrics={metrics ?? {
          totalRevenue: 0,
          monthlyRevenue: 0,
          totalBookings: 0,
          pendingBookings: 0,
          confirmedBookings: 0,
          occupancyRate: 0,
          averageBookingValue: 0,
          revenueGrowth: 0,
          topPerformingSpace: null
        }}
        recentActivity={recentActivity ?? []}
      />
    </div>
  );
};