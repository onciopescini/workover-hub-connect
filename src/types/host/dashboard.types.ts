import { HostDashboardMetrics, RecentActivity } from "../../hooks/queries/types/hostDashboardTypes";

export interface DashboardState {
  activeTab: string;
  shouldShowProgressTracker: boolean;
}

export interface HostDashboardProps {
  metrics?: HostDashboardMetrics;
  recentActivity?: RecentActivity[];
  isLoading: boolean;
}

export interface HostDashboardContentProps {
  firstName?: string;
  metrics?: HostDashboardMetrics;
  recentActivity?: RecentActivity[];
  activeTab: string;
  setActiveTab: (tab: string) => void;
  shouldShowProgressTracker: boolean;
}