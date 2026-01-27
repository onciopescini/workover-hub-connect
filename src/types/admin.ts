
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
  space_name: string;
  host_name: string;
  host_email: string;
}

export interface AdminActionLog {
  id: string;
  admin_id: string;
  action_type: string;
  target_type: string;
  target_id: string;
  description: string;
  created_at: string | null;
  metadata?: Record<string, unknown>;
  ip_address?: unknown;
  user_agent?: string | null;
  geo_location?: unknown;
  session_id?: string | null;
  admin_email?: string;
  // Legacy field for backward compatibility
  action?: string;
  details?: unknown;
}

export interface AdminSpace {
  id: string;
  title: string;
  author_id: string;
  category: string;
  published: boolean;
  is_suspended: boolean;
  created_at: string;
  city?: string;
  address?: string;
  workspace_features?: string[];
}

export interface AdminStats {
  total_users: number;
  total_hosts: number;
  total_bookings: number;
  total_revenue: number;
  active_listings: number;
}

export interface AdminProfile {
  id: string;
  email: string;
  role: 'super_admin' | 'admin' | 'moderator';
  permissions: string[];
  created_at: string;
  last_login?: string;
}
