
export interface AdminPlatformRevenue {
  month: string;
  total_payments: number;
  gross_volume: number;
  estimated_revenue: number;
}

export interface AdminUserStats {
  booking_count: number;
  space_count: number;
}

export interface AdminUser {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  created_at: string;
  is_suspended: boolean;
  booking_count: number;
  space_count: number;
}
