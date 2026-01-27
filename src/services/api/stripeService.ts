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

// Supabase project constants
const SUPABASE_URL = 'https://khtqwzvrxzsgfhsslwyz.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtodHF3enZyeHpzZ2Zoc3Nsd3l6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc5NDg0ODUsImV4cCI6MjA2MzUyNDQ4NX0.QThCoBfb0JuFZ5dLru-TNSA_B0PZqp8AL0x0yaEWNFk';

// ============= TYPES =============

export interface StripeAccountStatus {
  connected: boolean;
  accountId: string | null;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
  updated: boolean;
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

// ============= METHODS =============

/**
 * Check and update Stripe account connection status.
 * Calls the check-stripe-status Edge Function.
 */
export async function checkAccountStatus(): Promise<StripeAccountStatus> {
  const { data, error } = await supabase.functions.invoke('check-stripe-status');
  
  if (error) {
    throw new Error(`Stripe status check failed: ${error.message}`);
  }
  
  return {
    connected: data?.connected ?? false,
    accountId: data?.account_id ?? null,
    chargesEnabled: data?.charges_enabled ?? false,
    payoutsEnabled: data?.payouts_enabled ?? false,
    detailsSubmitted: data?.details_submitted ?? false,
    updated: data?.updated ?? false
  };
}

/**
 * Create or get Stripe Connect onboarding/dashboard link.
 * Uses native fetch for full header control.
 */
export async function createOnboardingLink(): Promise<StripeOnboardingResult> {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  
  if (sessionError || !sessionData.session?.access_token) {
    return { success: false, error: 'Session expired, please login again' };
  }
  
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/create-connect-onboarding-link`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${sessionData.session.access_token}`,
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY
      }
    });
    
    const data = await response.json();
    
    if (!response.ok || data.error) {
      return { success: false, error: data.error || 'Failed to create onboarding link' };
    }
    
    return {
      success: true,
      url: data.url,
      stripeAccountId: data.stripe_account_id
    };
  } catch (err) {
    return { success: false, error: 'Network error connecting to Stripe' };
  }
}

/**
 * Get payout information for a host.
 */
export async function getPayouts(hostId: string): Promise<StripePayoutData> {
  const { data, error } = await supabase.functions.invoke('get-stripe-payouts', {
    body: { host_id: hostId }
  });
  
  if (error) {
    throw new Error(`Failed to fetch payouts: ${error.message}`);
  }
  
  return {
    available_balance: data?.available_balance ?? 0,
    pending_balance: data?.pending_balance ?? 0,
    currency: data?.currency ?? 'EUR',
    last_payout: data?.last_payout ?? null,
    next_payout: data?.next_payout ?? null
  };
}
