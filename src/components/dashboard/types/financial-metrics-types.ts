
export interface FinancialMetricsProps {
  totalRevenue: number;
  monthlyRevenue: number;
  revenueGrowth: number;
  averageBookingValue: number;
  occupancyRate: number;
}

export interface MonthlyData {
  month: string;
  revenue: number;
  bookings: number;
}

export interface RevenueByCategory {
  name: string;
  value: number;
  color: string;
}
