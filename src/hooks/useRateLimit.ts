import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

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
        console.error('Rate limit check failed:', error);
        // Fail open - allow the request if rate limit check fails
        return {
          allowed: true,
          remaining: 5,
          resetTime: Date.now() + 60000
        };
      }

      const result = data as RateLimitResult;
      
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
      console.error('Rate limit check error:', error);
      // Fail open
      return {
        allowed: true,
        remaining: 5,
        resetTime: Date.now() + 60000
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