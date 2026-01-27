/**
 * Admin Service Layer
 * 
 * Handles all admin dashboard operations with proper error handling
 * and type safety.
 * 
 * USAGE:
 * import { getAllBookings, getAllUsers, toggleUserStatus, getSystemMetrics } from '@/services/api/adminService';
 */

import { supabase } from '@/integrations/supabase/client';
import type { AdminBooking, AdminStats } from '@/types/admin';
import type { AdminUser } from '@/types/admin-user';
import { mapAdminBookingRecord } from '@/lib/admin-mappers';

// ============= TYPES =============

export interface GetBookingsParams {
  page?: number;
  pageSize?: number;
  status?: string;
  search?: string;
}

export interface GetBookingsResult {
  bookings: AdminBooking[];
  totalCount: number;
}

// ============= METHODS =============

/**
 * Fetch all bookings with optional filtering.
 * Uses the admin_get_bookings RPC for security.
 */
export async function getAllBookings(params: GetBookingsParams = {}): Promise<GetBookingsResult> {
  const { page = 1, pageSize = 50, status, search } = params;
  
  const { data, error } = await supabase.rpc('admin_get_bookings');
  
  if (error) {
    throw new Error(`Failed to fetch bookings: ${error.message}`);
  }
  
  // Map and filter the results
  let bookings = (data || [])
    .map(mapAdminBookingRecord)
    .filter((item): item is AdminBooking => item !== null);
  
  // Apply client-side filtering
  if (status && status !== 'all') {
    bookings = bookings.filter(b => b.status === status);
  }
  
  if (search) {
    const searchLower = search.toLowerCase();
    bookings = bookings.filter(b =>
      b.coworker_name?.toLowerCase().includes(searchLower) ||
      b.coworker_email?.toLowerCase().includes(searchLower) ||
      b.space_name?.toLowerCase().includes(searchLower) ||
      b.host_name?.toLowerCase().includes(searchLower)
    );
  }
  
  // Apply pagination
  const start = (page - 1) * pageSize;
  const paginatedBookings = bookings.slice(start, start + pageSize);
  
  return {
    bookings: paginatedBookings,
    totalCount: bookings.length
  };
}

/**
 * Fetch all users for admin management.
 */
export async function getAllUsers(): Promise<AdminUser[]> {
  const { data, error } = await supabase
    .from('admin_users_view' as 'profiles')
    .select('*');
  
  if (error) {
    throw new Error(`Failed to fetch users: ${error.message}`);
  }
  
  return (data || []) as unknown as AdminUser[];
}

/**
 * Toggle user account status (active/suspended).
 */
export async function toggleUserStatus(userId: string, newStatus: 'active' | 'suspended'): Promise<void> {
  const isSuspended = newStatus === 'suspended';
  
  const { error } = await supabase
    .from('profiles')
    .update({ is_suspended: isSuspended })
    .eq('id', userId);
  
  if (error) {
    throw new Error(`Failed to update user status: ${error.message}`);
  }
}

/**
 * Get system-wide metrics for dashboard.
 */
export async function getSystemMetrics(): Promise<AdminStats> {
  const [
    { count: totalUsers },
    { count: totalHosts },
    { count: totalBookings },
    { count: activeListings },
    { data: payments }
  ] = await Promise.all([
    supabase.from('profiles').select('id', { count: 'exact', head: true }),
    supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'host'),
    supabase.from('bookings').select('id', { count: 'exact', head: true }),
    supabase.from('spaces').select('id', { count: 'exact', head: true }).eq('published', true),
    supabase.from('payments').select('amount').eq('payment_status', 'completed')
  ]);
  
  const totalRevenue = payments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;
  
  return {
    total_users: totalUsers || 0,
    total_hosts: totalHosts || 0,
    total_bookings: totalBookings || 0,
    total_revenue: totalRevenue,
    active_listings: activeListings || 0
  };
}
