/**
 * Host Analytics Types
 * Strict interfaces for the Host Analytics Dashboard
 */

/**
 * Monthly revenue data returned by get_host_monthly_revenue RPC
 */
export interface MonthlyRevenueData {
  month_label: string;      // e.g., "Jan"
  month_year: string;       // e.g., "Jan 2025"
  year_num: number;
  month_num: number;
  total_revenue: number;
  booking_count: number;
  avg_booking_value: number;
  platform_fees: number;
}

/**
 * Aggregated KPI metrics calculated from MonthlyRevenueData
 */
export interface HostAnalyticsKPIs {
  totalRevenue: number;
  totalBookings: number;
  avgBookingValue: number;
  totalPlatformFees: number;
  revenueChange: number;      // % change vs previous period
  bookingsChange: number;     // % change vs previous period
}

/**
 * Props for chart components
 */
export interface HostAnalyticsChartProps {
  data: MonthlyRevenueData[];
  isLoading: boolean;
}

/**
 * Props for the main dashboard
 */
export interface HostAnalyticsDashboardProps {
  hostId: string;
  monthsBack?: number;
}
