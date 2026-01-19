export interface HostDailyMetric {
  host_id: string;
  booking_date: string; // Format: YYYY-MM-DD
  total_bookings: number;
  confirmed_bookings: number;
  daily_revenue: number; // Stored as float/integer based on DB sum
}

export interface HostDashboardSummary {
  current_month_revenue: number;
  pending_bookings: number; // Count of 'pending_approval'
  next_payout: {
    amount: number; // amount in cents
    date: string | null; // YYYY-MM-DD
  } | null;
}
