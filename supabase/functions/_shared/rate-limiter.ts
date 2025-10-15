import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

export type RateLimitConfig = {
  maxRequests: number;
  windowMs: number;
  identifier: string; // user_id, ip_address, etc.
  action: string;
};

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  resetMs: number;
  message: string;
};

/**
 * Advanced rate limiter using Supabase RPC function
 * @param supabase Supabase client instance
 * @param config Rate limit configuration
 * @returns Rate limit result with allowed status and metadata
 */
export async function checkRateLimit(
  supabase: SupabaseClient,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  try {
    const { data, error } = await supabase.rpc('check_rate_limit_advanced', {
      p_identifier: config.identifier,
      p_action: config.action,
      p_max_requests: config.maxRequests,
      p_window_ms: config.windowMs
    });

    if (error) {
      console.error('[RATE_LIMITER] RPC error:', error);
      // Fail open - allow request if rate limiter fails
      return {
        allowed: true,
        remaining: config.maxRequests,
        resetMs: config.windowMs,
        message: 'Rate limiter error - allowing request'
      };
    }

    return data as RateLimitResult;
  } catch (error) {
    console.error('[RATE_LIMITER] Unexpected error:', error);
    // Fail open
    return {
      allowed: true,
      remaining: config.maxRequests,
      resetMs: config.windowMs,
      message: 'Rate limiter exception - allowing request'
    };
  }
}

/**
 * Common rate limit configurations
 */
export const RateLimitPresets = {
  PAYMENT_CREATION: { maxRequests: 5, windowMs: 60000 }, // 5 per minute
  WEBHOOK: { maxRequests: 100, windowMs: 60000 }, // 100 per minute
  AUTH: { maxRequests: 10, windowMs: 60000 }, // 10 per minute
  API_GENERAL: { maxRequests: 30, windowMs: 60000 }, // 30 per minute
};