import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { sreLogger } from '@/lib/sre-logger';

interface RateLimitResponse {
  allowed: boolean;
  limit?: number;
  remaining?: number;
  resetTime?: number;
  retryAfter?: number;
  error?: string;
}

interface RateLimitOptions {
  endpoint: string;
  identifier?: string;
  skipCheck?: boolean;
}

export const useRateLimit = () => {
  const [isChecking, setIsChecking] = useState(false);

  const checkRateLimit = useCallback(async (options: RateLimitOptions): Promise<RateLimitResponse> => {
    if (options.skipCheck) {
      return { allowed: true };
    }

    setIsChecking(true);
    
    try {
      // Create identifier from user ID, IP, or fallback
      const identifier = options.identifier || 'anonymous';

      const { data, error } = await supabase.functions.invoke('rate-limiter', {
        body: {
          endpoint: options.endpoint,
          identifier,
          userAgent: navigator.userAgent,
          ip: null // Will be detected server-side if needed
        }
      });

      if (error) {
        sreLogger.error('Rate limit check error', { endpoint: options.endpoint }, error as Error);
        // Allow request on error to not block legitimate users
        return { allowed: true, error: error.message };
      }

      // Transform response to match expected format
      return {
        allowed: data?.allowed || true,
        limit: data?.limit,
        remaining: data?.remaining,
        resetTime: data?.resetTime,
        retryAfter: data?.retryAfter,
        error: data?.error
      };
    } catch (error) {
      sreLogger.error('Rate limit check failed', { endpoint: options.endpoint }, error as Error);
      // Allow request on error
      return { allowed: true, error: 'Rate limit check failed' };
    } finally {
      setIsChecking(false);
    }
  }, []);

  return {
    checkRateLimit,
    isChecking
  };
};

// Rate limit decorator for functions
export const withRateLimit = (endpoint: string, options?: { identifier?: string }) => {
  return function <T extends (...args: any[]) => Promise<any>>(
    target: any,
    propertyName: string,
    descriptor: TypedPropertyDescriptor<T>
  ) {
    const method = descriptor.value!;

    descriptor.value = (async function (this: any, ...args: any[]) {
      const rateLimitResponse = await checkRateLimitStandalone(endpoint, options?.identifier);
      
      if (!rateLimitResponse.allowed) {
        throw new Error(`Rate limit exceeded. Try again in ${rateLimitResponse.retryAfter} seconds.`);
      }

      return method.apply(this, args);
    }) as T;
  };
};

// Standalone rate limit check
export const checkRateLimitStandalone = async (
  endpoint: string, 
  identifier?: string
): Promise<RateLimitResponse> => {
  try {
    const { data, error } = await supabase.functions.invoke('rate-limiter', {
      body: {
        endpoint,
        identifier: identifier || 'anonymous',
        userAgent: navigator.userAgent,
        ip: null
      }
    });

    if (error) {
      sreLogger.error('Rate limit check error', { endpoint }, error as Error);
      return { allowed: true, error: error.message };
    }

    return {
      allowed: data?.allowed || true,
      limit: data?.limit,
      remaining: data?.remaining,
      resetTime: data?.resetTime,
      retryAfter: data?.retryAfter,
      error: data?.error
    };
  } catch (error) {
    sreLogger.error('Rate limit check failed', { endpoint }, error as Error);
    return { allowed: true, error: 'Rate limit check failed' };
  }
};

// Rate limit middleware for form submissions
export const useFormRateLimit = (endpoint: string) => {
  const { checkRateLimit, isChecking } = useRateLimit();

  const submitWithRateLimit = useCallback(async <T>(
    submitFunction: () => Promise<T>
  ): Promise<T> => {
    const rateLimitCheck = await checkRateLimit({ endpoint });
    
    if (!rateLimitCheck.allowed) {
      const retryAfter = rateLimitCheck.retryAfter || 60;
      throw new Error(
        `Troppi tentativi. Riprova tra ${retryAfter} secondi.`
      );
    }

    return submitFunction();
  }, [checkRateLimit, endpoint]);

  return {
    submitWithRateLimit,
    isChecking
  };
};

export default useRateLimit;