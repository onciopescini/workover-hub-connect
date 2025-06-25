
import { HostDashboardMetrics, RecentActivity } from '@/hooks/queries/useEnhancedHostDashboard';

export interface DashboardTabsProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  metrics: HostDashboardMetrics;
  recentActivity: RecentActivity[];
}

export interface TabContentProps {
  metrics: HostDashboardMetrics;
  recentActivity: RecentActivity[];
}

export type DashboardTab = 'overview' | 'financial' | 'payments' | 'insights' | 'management';
