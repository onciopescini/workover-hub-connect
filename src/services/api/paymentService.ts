/**
 * Payment Service Layer
 * 
 * Handles all payment-related queries and operations with proper
 * error handling and type safety. Follows the Result Pattern.
 */

import { supabase } from '@/integrations/supabase/client';
import { sreLogger } from '@/lib/sre-logger';

// ============= TYPES =============

export interface Payment {
  id: string;
  booking_id: string;
  amount: number;
  currency: string;
  payment_status: string;
  host_amount: number | null;
  platform_fee: number | null;
  stripe_payment_intent_id: string | null;
  stripe_session_id: string | null;
  created_at: string | null;
  updated_at: string;
  user_id: string;
}

export interface PaymentWithDetails extends Payment {
  booking?: {
    id: string;
    booking_date: string;
    space_id: string | null;
  };
  space_name?: string;
}

export interface GetPaymentsParams {
  userId?: string;
  hostId?: string;
  status?: string;
  limit?: number;
}

export interface GetPaymentsResult {
  success: boolean;
  payments?: Payment[];
  error?: string;
}

export interface PaymentStats {
  totalRevenue: number;
  totalPayments: number;
  pendingAmount: number;
  completedAmount: number;
}

export interface GetPaymentStatsResult {
  success: boolean;
  stats?: PaymentStats;
  error?: string;
}

// ============= METHODS =============

/**
 * Get payments for a user (as coworker).
 */
export async function getUserPayments(userId: string, limit = 50): Promise<GetPaymentsResult> {
  if (!userId) {
    return { success: false, error: 'User ID is required' };
  }

  sreLogger.info('Fetching user payments', { component: 'paymentService', userId });

  try {
    const { data, error } = await supabase
      .from('payments')
      .select('id, booking_id, amount, currency, payment_status, host_amount, platform_fee, stripe_payment_intent_id, stripe_session_id, created_at, updated_at, user_id')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      sreLogger.error('Error fetching user payments', { component: 'paymentService' }, error);
      return { success: false, error: error.message };
    }

    return { success: true, payments: data as Payment[] };
  } catch (err) {
    sreLogger.error('Exception fetching user payments', { component: 'paymentService' }, err as Error);
    return { success: false, error: 'Failed to fetch payments' };
  }
}

/**
 * Get payments for a host (received payments).
 */
export async function getHostPayments(hostId: string, limit = 50): Promise<GetPaymentsResult> {
  if (!hostId) {
    return { success: false, error: 'Host ID is required' };
  }

  sreLogger.info('Fetching host payments', { component: 'paymentService', hostId });

  try {
    // Get payments through bookings where user booked host's spaces
    const { data, error } = await supabase
      .from('payments')
      .select(`
        id, booking_id, amount, currency, payment_status, host_amount, platform_fee, 
        stripe_payment_intent_id, stripe_session_id, created_at, updated_at, user_id,
        bookings!inner (
          id,
          booking_date,
          space_id,
          spaces!inner (
            host_id
          )
        )
      `)
      .eq('bookings.spaces.host_id', hostId)
      .eq('payment_status', 'completed')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      sreLogger.error('Error fetching host payments', { component: 'paymentService' }, error);
      return { success: false, error: error.message };
    }

    // Map to Payment type, extracting only the payment fields
    const payments: Payment[] = (data || []).map(row => ({
      id: row.id,
      booking_id: row.booking_id,
      amount: row.amount,
      currency: row.currency,
      payment_status: row.payment_status,
      host_amount: row.host_amount,
      platform_fee: row.platform_fee,
      stripe_payment_intent_id: row.stripe_payment_intent_id,
      stripe_session_id: row.stripe_session_id,
      created_at: row.created_at,
      updated_at: row.updated_at,
      user_id: row.user_id
    }));

    return { success: true, payments };
  } catch (err) {
    sreLogger.error('Exception fetching host payments', { component: 'paymentService' }, err as Error);
    return { success: false, error: 'Failed to fetch host payments' };
  }
}

/**
 * Get payment statistics for dashboard.
 */
export async function getPaymentStats(userId: string, asHost = false): Promise<GetPaymentStatsResult> {
  if (!userId) {
    return { success: false, error: 'User ID is required' };
  }

  sreLogger.info('Fetching payment stats', { component: 'paymentService', userId, asHost });

  try {
    if (asHost) {
      // For host, get payments on their spaces
      const { data: hostPayments, error } = await supabase
        .from('payments')
        .select(`
          amount,
          payment_status,
          host_amount,
          bookings!inner (
            spaces!inner (host_id)
          )
        `)
        .eq('bookings.spaces.host_id', userId);

      if (error) {
        throw error;
      }

      const stats: PaymentStats = {
        totalRevenue: hostPayments?.reduce((sum, p) => sum + (p.host_amount || 0), 0) || 0,
        totalPayments: hostPayments?.length || 0,
        pendingAmount: hostPayments?.filter(p => p.payment_status === 'pending')
          .reduce((sum, p) => sum + (p.host_amount || 0), 0) || 0,
        completedAmount: hostPayments?.filter(p => p.payment_status === 'completed')
          .reduce((sum, p) => sum + (p.host_amount || 0), 0) || 0,
      };

      return { success: true, stats };
    } else {
      // For coworker, get their payments
      const { data, error } = await supabase
        .from('payments')
        .select('amount, payment_status')
        .eq('user_id', userId);

      if (error) {
        sreLogger.error('Error fetching payment stats', { component: 'paymentService' }, error);
        return { success: false, error: error.message };
      }

      const stats: PaymentStats = {
        totalRevenue: data?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0,
        totalPayments: data?.length || 0,
        pendingAmount: data?.filter(p => p.payment_status === 'pending')
          .reduce((sum, p) => sum + (p.amount || 0), 0) || 0,
        completedAmount: data?.filter(p => p.payment_status === 'completed')
          .reduce((sum, p) => sum + (p.amount || 0), 0) || 0,
      };

      return { success: true, stats };
    }
  } catch (err) {
    sreLogger.error('Exception fetching payment stats', { component: 'paymentService' }, err as Error);
    return { success: false, error: 'Failed to fetch payment statistics' };
  }
}

/**
 * Get a single payment by ID.
 */
export async function getPaymentById(paymentId: string): Promise<{
  success: boolean;
  payment?: Payment;
  error?: string;
}> {
  if (!paymentId) {
    return { success: false, error: 'Payment ID is required' };
  }

  try {
    const { data, error } = await supabase
      .from('payments')
      .select('id, booking_id, amount, currency, payment_status, host_amount, platform_fee, stripe_payment_intent_id, stripe_session_id, created_at, updated_at, user_id')
      .eq('id', paymentId)
      .single();

    if (error) {
      sreLogger.error('Error fetching payment', { component: 'paymentService' }, error);
      return { success: false, error: error.message };
    }

    return { success: true, payment: data as Payment };
  } catch (err) {
    sreLogger.error('Exception fetching payment', { component: 'paymentService' }, err as Error);
    return { success: false, error: 'Failed to fetch payment' };
  }
}
