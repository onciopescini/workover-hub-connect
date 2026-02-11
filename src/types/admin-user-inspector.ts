export interface AdminUserInspectorProfile {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  profile_photo_url: string | null;
  created_at: string;
  status: string;
  is_suspended: boolean | null;
  suspended_at: string | null;
  suspended_by: string | null;
  stripe_account_id: string | null;
  stripe_connected: boolean | null;
  stripe_onboarding_status: string | null;
}

export interface AdminUserInspectorRole {
  role: string;
  assigned_at: string | null;
  assigned_by: string | null;
}

export interface AdminUserInspectorStripeStatus {
  stripe_account_id: string | null;
  stripe_connected: boolean | null;
  stripe_onboarding_status: string | null;
}

export interface AdminUserInspectorHostSpace {
  id: string;
  title: string;
  published: boolean;
  is_suspended: boolean | null;
  status: 'active' | 'suspended';
  created_at: string;
  updated_at: string;
}

export interface AdminUserInspectorBooking {
  id: string;
  booking_date: string;
  start_time: string | null;
  end_time: string | null;
  status: string | null;
  space_id: string | null;
  space_title: string | null;
  created_at: string | null;
}

export interface AdminUserInspectorBookingAsGuest extends AdminUserInspectorBooking {
  host_id: string | null;
}

export interface AdminUserInspectorBookingAsHost extends AdminUserInspectorBooking {
  guest_id: string;
}

export interface AdminUserInspectorAdminLog {
  id: string;
  admin_id: string;
  action: string;
  target_id: string;
  metadata: Record<string, unknown> | null;
  created_at: string | null;
}

export interface AdminUserInspectorDetail {
  profile: AdminUserInspectorProfile;
  roles: AdminUserInspectorRole[];
  stripe_status: AdminUserInspectorStripeStatus;
  host_spaces: AdminUserInspectorHostSpace[];
  recent_bookings_as_guest: AdminUserInspectorBookingAsGuest[];
  recent_bookings_as_host: AdminUserInspectorBookingAsHost[];
  admin_logs: AdminUserInspectorAdminLog[];
}
