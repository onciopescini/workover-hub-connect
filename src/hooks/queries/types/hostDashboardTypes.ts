
export interface HostDashboardMetrics {
  totalRevenue: number;
  monthlyRevenue: number;
  totalBookings: number;
  pendingBookings: number;
  confirmedBookings: number;
  occupancyRate: number;
  averageBookingValue: number;
  revenueGrowth: number;
  topPerformingSpace: {
    id: string;
    title: string;
    revenue: number;
  } | null;
}

export interface RecentActivity {
  id: string;
  type: 'booking' | 'message' | 'review';
  title: string;
  description: string;
  created_at: string;
  metadata: any;
}
