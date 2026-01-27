/**
 * Database View Type Definitions
 * 
 * Type definitions for Supabase database views to replace
 * 'as any' casts with proper typing.
 */

// ============= ADMIN VIEWS =============

export interface AdminUsersView {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  created_at: string | null;
  role: string | null;
  is_suspended: boolean;
  is_verified: boolean;
  profile_photo_url: string | null;
  total_bookings: number;
  total_revenue: number;
  stripe_account_id: string | null;
  last_login_at: string | null;
}

export interface AdminPlatformRevenueView {
  month: string;
  total_payments: number;
  gross_volume: number;
  estimated_revenue: number;
  net_revenue: number;
  platform_fees: number;
}

export interface AdminBookingsView {
  id: string;
  booking_date: string;
  start_time: string | null;
  end_time: string | null;
  status: string | null;
  total_price: number | null;
  guests_count: number;
  created_at: string | null;
  updated_at: string | null;
  user_id: string;
  space_id: string | null;
  coworker_name: string | null;
  coworker_email: string | null;
  space_name: string | null;
  host_name: string | null;
  host_id: string | null;
}

// ============= HOST VIEWS =============

export interface HostDailyMetricsView {
  booking_date: string;
  daily_revenue: number;
  total_bookings: number;
  confirmed_bookings: number;
  cancelled_bookings: number;
  pending_bookings: number;
  host_id: string;
}

export interface HostPayoutsView {
  id: string;
  host_id: string;
  amount: number;
  currency: string;
  status: string;
  arrival_date: string | null;
  created_at: string;
  stripe_transfer_id: string | null;
}

// ============= PUBLIC VIEWS =============

export interface SpacesPublicView {
  id: string;
  title: string;
  description: string | null;
  address: string | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
  hourly_rate: number | null;
  daily_rate: number | null;
  max_capacity: number | null;
  workspace_type: string | null;
  workspace_features: string[] | null;
  images: string[] | null;
  published: boolean;
  host_id: string;
  host_name: string | null;
  host_avatar: string | null;
  cached_avg_rating: number | null;
  total_reviews: number;
}

export interface ProfilesPublicSafeView {
  id: string;
  first_name: string | null;
  last_name: string | null;
  profile_photo_url: string | null;
  profession: string | null;
  bio: string | null;
  cached_avg_rating: number | null;
  linkedin_url: string | null;
}

// ============= COWORKER VIEWS =============

export interface CoworkerBookingsView {
  id: string;
  booking_date: string;
  start_time: string | null;
  end_time: string | null;
  status: string | null;
  total_price: number | null;
  space_name: string | null;
  space_address: string | null;
  host_name: string | null;
  host_avatar: string | null;
}

// ============= TYPE GUARDS =============

export function isAdminUsersView(data: unknown): data is AdminUsersView {
  return (
    typeof data === 'object' &&
    data !== null &&
    'id' in data &&
    'email' in data
  );
}

export function isAdminBookingsView(data: unknown): data is AdminBookingsView {
  return (
    typeof data === 'object' &&
    data !== null &&
    'id' in data &&
    'booking_date' in data
  );
}
