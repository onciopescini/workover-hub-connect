
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
  status: 'active' | 'suspended';
  booking_count: number;
  space_count: number;
}

export interface AdminBooking {
  booking_id: string;
  created_at: string;
  check_in_date: string;
  check_out_date: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'pending_approval' | 'pending_payment' | 'served' | 'refunded' | 'disputed' | 'frozen' | 'checked_in';
  total_price: number;
  coworker_name: string;
  coworker_email: string;
  coworker_avatar_url: string | null;
  workspace_name: string;
  host_name: string;
  host_email: string;
}
