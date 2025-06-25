
export interface RevenueData {
  totalRevenue: number;
  totalBookings: number;
  recentPayouts: Array<{
    id: string;
    amount: number;
    date: string;
    booking_id: string;
    space_title: string;
  }>;
  monthlyRevenue: Array<{
    month: string;
    revenue: number;
    bookings: number;
  }>;
}

export interface DAC7Data {
  totalIncome: number;
  totalTransactions: number;
  thresholdMet: boolean;
  reportingYear: number;
}

interface Dac7ThresholdResult {
  total_income: number;
  total_transactions: number;
  threshold_met: boolean;
}

export type { Dac7ThresholdResult };
