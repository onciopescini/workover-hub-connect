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
    <div className="container mx-auto py-6 px-4 space-y-6">
      <HostDashboardHeader firstName={firstName ?? ''} />
      
      {metrics && <HostDashboardMetrics metrics={metrics} />}
      
      {/* 2-column layout for desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">
        {/* Left column - Main content */}
        <div className="space-y-6">
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
        
        {/* Right column - Sidebar */}
        <div className="space-y-6 lg:sticky lg:top-20 lg:self-start">
          {shouldShowProgressTracker && <HostProgressTracker />}
        </div>
      </div>
    </div>
  );
};