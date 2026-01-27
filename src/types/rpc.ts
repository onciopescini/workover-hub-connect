/**
 * RPC Response Type Definitions
 * 
 * Explicit interfaces for all Supabase RPC function responses
 * to eliminate 'any' casts and improve type safety.
 */

// ============= READONLY RESPONSE WRAPPERS =============
// Prevents accidental mutation of service response data in the UI

export type ReadonlyRPCResponse<T> = Readonly<T>;

// ============= BOOKING RPCs =============

export interface ValidateSlotRPCResponse {
  booking_id: string;
  status: 'frozen' | 'pending' | 'confirmed';
}

export interface CheckSelfBookingRPCResponse {
  is_self_booking: boolean;
}

// ============= ADMIN RPCs =============

export interface AdminBookingRecord {
  id: string;
  booking_date: string;
  start_time: string | null;
  end_time: string | null;
  status: string | null;
  total_price: number | null;
  guests_count: number;
  created_at: string | null;
  user_id: string;
  space_id: string | null;
  coworker_first_name: string | null;
  coworker_last_name: string | null;
  coworker_email: string | null;
  space_name: string | null;
  host_id: string | null;
  host_first_name: string | null;
  host_last_name: string | null;
}

// ============= FISCAL RPCs =============

export interface DAC7ThresholdRPCResponse {
  total_income: number;
  total_transactions: number;
  threshold_met: boolean;
}

// ============= COWORKER RPCs =============

export interface GetCoworkersRPCResponse {
  id: string;
  first_name: string;
  last_name: string;
  profession: string | null;
  avatar_url: string | null;
  cached_avg_rating: number | null;
  linkedin_url: string | null;
}

// ============= PROFILE RPCs =============

export interface ProfileRPCResponse {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  role: string | null;
  is_suspended: boolean;
  created_at: string | null;
  updated_at: string | null;
}

// ============= STRIPE RPCs =============

export interface StripeStatusRPCResponse {
  connected: boolean;
  account_id: string | null;
  charges_enabled: boolean;
  payouts_enabled: boolean;
  details_submitted: boolean;
  updated: boolean;
}

// ============= NOTIFICATION RPCs =============

export interface NotificationRPCResponse {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
  metadata: Record<string, unknown> | null;
}
