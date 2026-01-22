import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { logError, logInfo } from '@/lib/sre-logger';
import type { Database } from '@/integrations/supabase/types';

interface SessionStateOptions {
  ttlHours?: number;
  fallbackToLocal?: boolean;
}

export function useSessionState<T>(
  key: string,
  defaultValue: T,
  options: SessionStateOptions = {}
) {
  const { ttlHours = 24, fallbackToLocal = true } = options;
  const [state, setState] = useState<T>(defaultValue);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  // Initialize: fetch from DB or localStorage
  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user?.id || null);

      if (!user?.id) {
        // Fallback to localStorage for non-authenticated users
        if (fallbackToLocal) {
          const stored = localStorage.getItem(key);
          if (stored) {
            try {
              setState(JSON.parse(stored));
            } catch (e) {
              logError('Session state parse failed', { context: 'session_state_parse', key }, e as Error);
            }
          }
        }
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('user_session_state')
          .select('session_data, expires_at')
          .eq('user_id', user.id)
          .eq('session_key', key)
          .gt('expires_at', new Date().toISOString())
          .maybeSingle();

        if (error) throw error;

        if (data) {
          setState(data.session_data as T);
          logInfo('session_state_loaded', { key, user_id: user.id });
        }
      } catch (error) {
        logError('Session state init failed', { context: 'session_state_init', key }, error as Error);
        
        // Fallback to localStorage
        if (fallbackToLocal) {
          const stored = localStorage.getItem(key);
          if (stored) {
            try {
              setState(JSON.parse(stored));
            } catch (e) {
              logError('Session state parse failed (fallback)', { context: 'session_state_parse', key }, e as Error);
            }
          }
        }
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [key, fallbackToLocal]);

  const updateState = useCallback(async (newValue: T | ((prev: T) => T)) => {
    const updatedValue = typeof newValue === 'function' 
      ? (newValue as (prev: T) => T)(state)
      : newValue;

    setState(updatedValue);

    // Save to localStorage first (immediate)
    if (fallbackToLocal) {
      try {
        localStorage.setItem(key, JSON.stringify(updatedValue));
      } catch (e) {
        logError('Session state local save failed', { context: 'session_state_local_save', key }, e as Error);
      }
    }

    // Save to database (async)
    if (userId) {
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + ttlHours);

      try {
        type SessionStateInsert = Database['public']['Tables']['user_session_state']['Insert'];
        const payload: SessionStateInsert = {
          user_id: userId,
          session_key: key,
          session_data: updatedValue as unknown,
          expires_at: expiresAt.toISOString()
        };

        const { error } = await supabase
          .from('user_session_state')
          .upsert(payload, {
            onConflict: 'user_id,session_key'
          });

        if (error) throw error;

        logInfo('session_state_saved', { key, user_id: userId, ttl_hours: ttlHours });
      } catch (error) {
        logError('Session state save failed', { context: 'session_state_save', key }, error as Error);
      }
    }
  }, [key, state, userId, ttlHours, fallbackToLocal]);

  const clearState = useCallback(async () => {
    setState(defaultValue);

    if (fallbackToLocal) {
      localStorage.removeItem(key);
    }

    if (userId) {
      try {
        await supabase
          .from('user_session_state')
          .delete()
          .eq('user_id', userId)
          .eq('session_key', key);

        logInfo('session_state_cleared', { key, user_id: userId });
      } catch (error) {
        logError('Session state clear failed', { context: 'session_state_clear', key }, error as Error);
      }
    }
  }, [key, userId, defaultValue, fallbackToLocal]);

  return {
    state,
    setState: updateState,
    clearState,
    loading
  };
}
