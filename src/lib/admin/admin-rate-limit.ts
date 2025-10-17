import { supabase } from "@/integrations/supabase/client";

export type AdminAction = 
  | 'csv_export' 
  | 'kyc_approval' 
  | 'dac7_generation' 
  | 'report_moderation'
  | 'space_suspension';

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

const RATE_LIMITS: Record<AdminAction, RateLimitConfig> = {
  csv_export: { maxRequests: 10, windowMs: 3600000 }, // 10/hour
  kyc_approval: { maxRequests: 50, windowMs: 3600000 }, // 50/hour
  dac7_generation: { maxRequests: 5, windowMs: 3600000 }, // 5/hour
  report_moderation: { maxRequests: 100, windowMs: 3600000 }, // 100/hour
  space_suspension: { maxRequests: 20, windowMs: 3600000 } // 20/hour
};

export async function checkAdminRateLimit(
  adminId: string,
  action: AdminAction
): Promise<{
  allowed: boolean;
  remaining: number;
  resetMs: number;
  message?: string;
}> {
  const config = RATE_LIMITS[action];

  try {
    const { data, error } = await supabase.rpc('check_rate_limit_advanced', {
      p_identifier: adminId,
      p_action: action,
      p_max_requests: config.maxRequests,
      p_window_ms: config.windowMs
    });

    if (error) {
      console.error('[checkAdminRateLimit] Error:', error);
      throw error;
    }

    if (!data) {
      throw new Error('No data returned from rate limit check');
    }

    const result = data as any;

    return {
      allowed: result.allowed as boolean,
      remaining: result.remaining as number,
      resetMs: result.reset_ms as number,
      message: result.message as string
    };
  } catch (error) {
    console.error('[checkAdminRateLimit] Exception:', error);
    // Fail open in case of rate limit errors
    return {
      allowed: true,
      remaining: config.maxRequests,
      resetMs: config.windowMs,
      message: 'Rate limit check failed, allowing request'
    };
  }
}

export function formatRateLimitError(resetMs: number): string {
  const minutes = Math.ceil(resetMs / 60000);
  if (minutes < 60) {
    return `Rate limit exceeded. Please wait ${minutes} minute${minutes > 1 ? 's' : ''} before trying again.`;
  }
  const hours = Math.ceil(minutes / 60);
  return `Rate limit exceeded. Please wait ${hours} hour${hours > 1 ? 's' : ''} before trying again.`;
}