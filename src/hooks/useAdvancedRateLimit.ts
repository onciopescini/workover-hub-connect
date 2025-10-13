import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface RateLimitResponse {
  allowed: boolean;
  remaining: number;
  resetTime: string;
  message: string;
}

interface RateLimitOptions {
  action: string;
  identifier?: string; // Optional: defaults to user ID or IP
}

export const useAdvancedRateLimit = () => {
  const [isChecking, setIsChecking] = useState(false);

  const checkRateLimit = useCallback(async (options: RateLimitOptions): Promise<RateLimitResponse> => {
    setIsChecking(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const identifier = options.identifier || user?.id || 'anonymous';

      const { data, error } = await supabase.functions.invoke('check-rate-limit', {
        body: {
          identifier,
          action: options.action
        }
      });

      if (error) throw error;

      return data as RateLimitResponse;
    } catch (error) {
      console.error('Rate limit check failed:', error);
      // Fail open: allow request if rate limit check fails
      return {
        allowed: true,
        remaining: 0,
        resetTime: new Date().toISOString(),
        message: 'Rate limit check failed, proceeding anyway'
      };
    } finally {
      setIsChecking(false);
    }
  }, []);

  return {
    checkRateLimit,
    isChecking
  };
};
