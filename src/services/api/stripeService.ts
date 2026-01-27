/**
 * Stripe Service Layer
 * 
 * Handles all Stripe Connect operations with proper error handling
 * and type safety.
 * 
 * USAGE:
 * import { checkAccountStatus, createOnboardingLink, getPayouts } from '@/services/api/stripeService';
 */

import { supabase } from '@/integrations/supabase/client';
import { sreLogger } from '@/lib/sre-logger';

// ============= TYPES =============

export interface StripeAccountStatus {
  connected: boolean;
  accountId: string | null;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
  updated: boolean;
}

export interface CheckAccountStatusResult {
  success: boolean;
  data?: StripeAccountStatus;
  error?: string;
}

export interface StripeOnboardingResult {
  success: boolean;
  url?: string;
  stripeAccountId?: string;
  error?: string;
}

export interface StripePayoutData {
  available_balance: number;
  pending_balance: number;
  currency: string;
  last_payout: {
    amount: number;
    arrival_date: string;
    status: string;
  } | null;
  next_payout: {
    amount: number;
    date: string;
  } | null;
}

export interface GetPayoutsResult {
  success: boolean;
  data?: StripePayoutData;
  error?: string;
}

// ============= METHODS =============

/**
 * Check and update Stripe account connection status.
 * Calls the check-stripe-status Edge Function.
 */
export async function checkAccountStatus(): Promise<CheckAccountStatusResult> {
  const { data, error } = await supabase.functions.invoke('check-stripe-status');
  
  if (error) {
    sreLogger.error('Stripe status check failed', { component: 'stripeService' }, error);
    return { success: false, error: error.message };
  }
  
  return {
    success: true,
    data: {
      connected: data?.connected ?? false,
      accountId: data?.account_id ?? null,
      chargesEnabled: data?.charges_enabled ?? false,
      payoutsEnabled: data?.payouts_enabled ?? false,
      detailsSubmitted: data?.details_submitted ?? false,
      updated: data?.updated ?? false
    }
  };
}

/**
 * Create or get Stripe Connect onboarding/dashboard link.
 * Uses supabase.functions.invoke for consistency.
 */
export async function createOnboardingLink(): Promise<StripeOnboardingResult> {
  const { data, error } = await supabase.functions.invoke('create-connect-onboarding-link', {
    method: 'POST'
  });
  
  if (error) {
    sreLogger.error('Failed to create onboarding link', { component: 'stripeService' }, error);
    return { success: false, error: error.message };
  }
  
  if (data?.error) {
    return { success: false, error: data.error };
  }
  
  return {
    success: true,
    url: data?.url,
    stripeAccountId: data?.stripe_account_id
  };
}

/**
 * Get payout information for a host.
 */
export async function getPayouts(hostId: string): Promise<GetPayoutsResult> {
  if (!hostId) {
    return { success: false, error: 'Host ID is required' };
  }

  const { data, error } = await supabase.functions.invoke('get-stripe-payouts', {
    body: { host_id: hostId }
  });
  
  if (error) {
    sreLogger.error('Failed to fetch payouts', { component: 'stripeService', hostId }, error);
    return { success: false, error: error.message };
  }
  
  return {
    success: true,
    data: {
      available_balance: data?.available_balance ?? 0,
      pending_balance: data?.pending_balance ?? 0,
      currency: data?.currency ?? 'EUR',
      last_payout: data?.last_payout ?? null,
      next_payout: data?.next_payout ?? null
    }
  };
}
