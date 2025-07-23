
import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  message?: string;
}

interface UseRateLimitReturn {
  checkRateLimit: (action: 'login' | 'password_reset', identifier?: string) => Promise<RateLimitResult>;
  isRateLimited: boolean;
  remainingTime: number;
  message: string;
}

// Type validation function for API response
const validateRateLimitResponse = (data: unknown): RateLimitResult => {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid rate limit response: not an object');
  }

  const response = data as Record<string, unknown>;

  if (typeof response['allowed'] !== 'boolean') {
    throw new Error('Invalid rate limit response: missing or invalid allowed field');
  }

  if (typeof response['remaining'] !== 'number') {
    throw new Error('Invalid rate limit response: missing or invalid remaining field');
  }

  if (typeof response['resetTime'] !== 'number') {
    throw new Error('Invalid rate limit response: missing or invalid resetTime field');
  }

  if (response['message'] !== undefined && typeof response['message'] !== 'string') {
    throw new Error('Invalid rate limit response: invalid message field');
  }

  const result: RateLimitResult = {
    allowed: response['allowed'] as boolean,
    remaining: response['remaining'] as number,
    resetTime: response['resetTime'] as number
  };

  if (response['message'] !== undefined) {
    result.message = response['message'] as string;
  }

  return result;
};

export const useRateLimit = (): UseRateLimitReturn => {
  const [isRateLimited, setIsRateLimited] = useState(false);
  const [remainingTime, setRemainingTime] = useState(0);
  const [message, setMessage] = useState('');

  const checkRateLimit = useCallback(async (
    action: 'login' | 'password_reset', 
    identifier?: string
  ): Promise<RateLimitResult> => {
    try {
      const { data, error } = await supabase.functions.invoke('auth-rate-limit', {
        body: { action, identifier }
      });

      if (error) {
        logger.error('Rate limit check failed', { action, ...(identifier && { identifier }) }, error);
        // Fail closed - deny the request if rate limit check fails
        return {
          allowed: false,
          remaining: 0,
          resetTime: Date.now() + 60000,
          message: 'Servizio temporaneamente non disponibile. Riprova più tardi.'
        };
      }

      // Validate and parse response data
      const result = validateRateLimitResponse(data);
      
      if (!result.allowed) {
        setIsRateLimited(true);
        setMessage(result.message || 'Troppi tentativi. Riprova più tardi.');
        
        // Calculate remaining time
        const remainingSeconds = Math.ceil((result.resetTime - Date.now()) / 1000);
        setRemainingTime(remainingSeconds);
        
        // Start countdown
        const countdown = setInterval(() => {
          setRemainingTime(prev => {
            if (prev <= 1) {
              clearInterval(countdown);
              setIsRateLimited(false);
              setMessage('');
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      } else {
        setIsRateLimited(false);
        setRemainingTime(0);
        setMessage('');
      }

      return result;
    } catch (error) {
      logger.error('Rate limit check error', { action, ...(identifier && { identifier }) }, error as Error);
      // Fail closed
      return {
        allowed: false,
        remaining: 0,
        resetTime: Date.now() + 60000,
        message: 'Servizio temporaneamente non disponibile. Riprova più tardi.'
      };
    }
  }, []);

  return {
    checkRateLimit,
    isRateLimited,
    remainingTime,
    message
  };
};
